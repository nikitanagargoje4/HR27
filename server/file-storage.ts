import { promises as fs } from "fs";
import path from "path";
import session from "express-session";
import createMemoryStore from "memorystore";
import { 
  User, InsertUser, Department, InsertDepartment, 
  Attendance, InsertAttendance, LeaveRequest, InsertLeaveRequest,
  Holiday, InsertHoliday, Notification, InsertNotification,
  PaymentRecord, InsertPaymentRecord
} from "@shared/schema";
import { IStorage } from "./storage";

const MemoryStore = createMemoryStore(session);

interface StorageData {
  users: User[];
  departments: Department[];
  attendanceRecords: Attendance[];
  leaveRequests: LeaveRequest[];
  holidayRecords: Holiday[];
  notifications: Notification[];
  paymentRecords: PaymentRecord[];
  currentUserId: number;
  currentDepartmentId: number;
  currentAttendanceId: number;
  currentLeaveRequestId: number;
  currentHolidayId: number;
  currentNotificationId: number;
  currentPaymentRecordId: number;
}

export class FileStorage implements IStorage {
  private dataFilePath: string;
  private data: StorageData;
  sessionStore: session.Store;

  constructor(dataPath: string = "data/hr-data.json") {
    this.dataFilePath = dataPath;
    this.data = {
      users: [],
      departments: [],
      attendanceRecords: [],
      leaveRequests: [],
      holidayRecords: [],
      notifications: [],
      paymentRecords: [],
      currentUserId: 1,
      currentDepartmentId: 1,
      currentAttendanceId: 1,
      currentLeaveRequestId: 1,
      currentHolidayId: 1,
      currentNotificationId: 1,
      currentPaymentRecordId: 1,
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async initialize() {
    await this.ensureDataDirectory();
    await this.loadData();
    
    // Initialize with sample data if empty
    if (this.data.departments.length === 0) {
      await this.initializeDefaultData();
    }
  }

  private async ensureDataDirectory() {
    const dir = path.dirname(this.dataFilePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory already exists or couldn't create
    }
  }

  private async loadData() {
    try {
      const fileContent = await fs.readFile(this.dataFilePath, 'utf-8');
      this.data = JSON.parse(fileContent);
      
      // Convert date strings back to Date objects
      this.data.users = this.data.users.map(user => ({
        ...user,
        joinDate: user.joinDate ? new Date(user.joinDate) : new Date()
      }));
      
      this.data.attendanceRecords = this.data.attendanceRecords.map(record => ({
        ...record,
        checkInTime: record.checkInTime ? new Date(record.checkInTime) : null,
        checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
        date: record.date ? new Date(record.date) : null,
      }));
      
      this.data.leaveRequests = this.data.leaveRequests.map(request => ({
        ...request,
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        createdAt: request.createdAt ? new Date(request.createdAt) : new Date()
      }));
      
      this.data.holidayRecords = this.data.holidayRecords.map(holiday => ({
        ...holiday,
        date: new Date(holiday.date)
      }));
      
      // Handle payment records if they exist in the data
      if (this.data.paymentRecords) {
        this.data.paymentRecords = this.data.paymentRecords.map(record => ({
          ...record,
          paymentDate: record.paymentDate ? new Date(record.paymentDate) : null,
          createdAt: record.createdAt ? new Date(record.createdAt) : null,
        }));
      } else {
        this.data.paymentRecords = [];
      }
      
    } catch (error) {
      // File doesn't exist, start with empty data
      console.log("No existing data file found, starting with empty data");
    }
  }

  private async saveData() {
    await this.ensureDataDirectory();
    await fs.writeFile(this.dataFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private async initializeDefaultData() {
    // Initialize with sample departments
    await this.createDepartment({ 
      name: "Human Resources", 
      description: "Manages employee relations, hiring, and company policies" 
    });
    await this.createDepartment({ 
      name: "Engineering", 
      description: "Software development and technical operations" 
    });
    await this.createDepartment({ 
      name: "Marketing", 
      description: "Handles brand awareness and promotional activities" 
    });
    await this.createDepartment({ 
      name: "Finance", 
      description: "Manages financial planning and accounting" 
    });
    
    // Initialize with default users (pre-hashed passwords)
    
    // Admin user - Password: admin123
    await this.initializeUser({
      username: "admin",
      password: "c56a7d8799d79a96bd917d2aea44a92cd3525c4313b14bf45467e40ee4a5b4b4b2d9cab3fe0aac89a56a4c00060a28226ef445e9969fce314e41a9fffd1b3ff4.6a2da20943931e46",
      email: "admin@hrconnect.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin" as const,
      departmentId: 1,
      position: "HR Director",
      phoneNumber: "123-456-7890",
      address: "123 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    });
    
    // HR user - Password: hr123
    await this.initializeUser({
      username: "hr",
      password: "4ed0c57d4e5b87cd80d3a2060e82c30e6e8cddea45e9655bd2eb471192c1e8bb6e7a15d7f8134c04dcbe56f5ee49b249f38a63ddcd4d81a64ca0c8c06aa67154.b1d6f9fdf91e77c8",
      email: "hr@hrconnect.com",
      firstName: "HR",
      lastName: "Manager",
      role: "hr" as const,
      departmentId: 1,
      position: "HR Manager",
      phoneNumber: "123-456-7891",
      address: "124 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    });
    
    // Manager user - Password: manager123
    await this.initializeUser({
      username: "manager",
      password: "f064cc778f9ee67f2a3b2d8a7a0e4a8f06e1b12e7d68b1cb0b5c87ca3ad13cefc8e22f3bb8a0d9f5ce78ca28ba9ecc20889c27b20e93917545a85979fc92987.9a3992ad0c5f4ce2",
      email: "manager@hrconnect.com",
      firstName: "Department",
      lastName: "Manager",
      role: "manager" as const,
      departmentId: 2,
      position: "Engineering Manager",
      phoneNumber: "123-456-7892",
      address: "125 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    });
    
    // Regular employee - Password: employee123
    await this.initializeUser({
      username: "employee",
      password: "2d8e6f2a8dd8c5ec52e499bbc1415cff0ea8af36aca4cac16d8bcbe5c967f0cbf5af81f0c1b5ce23b1b7122dea5562d7c1b83d66a5d76deb7f092ab7df283e4.ba4b61d276ab9d68",
      email: "employee@hrconnect.com",
      firstName: "Regular",
      lastName: "Employee",
      role: "employee" as const,
      departmentId: 2,
      position: "Software Developer",
      phoneNumber: "123-456-7893",
      address: "126 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    });
  }

  // Helper method for initializing users with pre-hashed passwords
  private async initializeUser(user: Omit<User, 'id'>) {
    const id = this.data.currentUserId++;
    const newUser: User = { ...user, id };
    this.data.users.push(newUser);
    await this.saveData();
    return newUser;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.data.users.find(u => u.id === id);
  }

  async getUsers(): Promise<User[]> {
    return this.data.users;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.data.users.find(u => u.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.data.users.find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.data.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      joinDate: insertUser.joinDate || new Date(),
      isActive: insertUser.isActive ?? true,
      departmentId: insertUser.departmentId ?? null,
      position: insertUser.position ?? null,
      phoneNumber: insertUser.phoneNumber ?? null,
      address: insertUser.address ?? null
    };
    this.data.users.push(user);
    await this.saveData();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    
    const updatedUser = { ...this.data.users[index], ...userData };
    this.data.users[index] = updatedUser;
    await this.saveData();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    this.data.users.splice(index, 1);
    await this.saveData();
    return true;
  }
  
  async getUsersByDepartment(departmentId: number): Promise<User[]> {
    return this.data.users.filter(u => u.departmentId === departmentId);
  }

  async getAdminUsers(): Promise<User[]> {
    return this.data.users.filter(u => u.role === 'admin' || u.role === 'hr');
  }

  // Department methods
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.data.departments.find(d => d.id === id);
  }

  async getDepartments(): Promise<Department[]> {
    return this.data.departments;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const id = this.data.currentDepartmentId++;
    const department: Department = { 
      ...insertDepartment, 
      id,
      description: insertDepartment.description ?? null
    };
    this.data.departments.push(department);
    await this.saveData();
    return department;
  }

  async updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined> {
    const index = this.data.departments.findIndex(d => d.id === id);
    if (index === -1) return undefined;
    
    const updatedDepartment = { ...this.data.departments[index], ...departmentData };
    this.data.departments[index] = updatedDepartment;
    await this.saveData();
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const index = this.data.departments.findIndex(d => d.id === id);
    if (index === -1) return false;
    
    this.data.departments.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Attendance methods
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.data.attendanceRecords.find(a => a.id === id);
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return this.data.attendanceRecords.filter(a => a.userId === userId);
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    const dateString = date.toDateString();
    return this.data.attendanceRecords.filter(
      record => record.date && new Date(record.date).toDateString() === dateString
    );
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return this.data.attendanceRecords;
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = this.data.currentAttendanceId++;
    const attendance: Attendance = { 
      ...insertAttendance, 
      id,
      date: insertAttendance.date ?? null,
      status: insertAttendance.status ?? 'present',
      checkInTime: insertAttendance.checkInTime ?? null,
      checkOutTime: insertAttendance.checkOutTime ?? null,
      notes: insertAttendance.notes ?? null
    };
    this.data.attendanceRecords.push(attendance);
    await this.saveData();
    return attendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const index = this.data.attendanceRecords.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    
    const updatedAttendance = { ...this.data.attendanceRecords[index], ...attendanceData };
    this.data.attendanceRecords[index] = updatedAttendance;
    await this.saveData();
    return updatedAttendance;
  }

  // Leave methods
  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    return this.data.leaveRequests.find(l => l.id === id);
  }

  async getLeaveRequestsByUser(userId: number): Promise<LeaveRequest[]> {
    return this.data.leaveRequests.filter(l => l.userId === userId);
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return this.data.leaveRequests.filter(l => l.status === 'pending');
  }

  async createLeaveRequest(insertLeaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = this.data.currentLeaveRequestId++;
    const leaveRequest: LeaveRequest = { 
      ...insertLeaveRequest, 
      id,
      status: insertLeaveRequest.status ?? 'pending',
      reason: insertLeaveRequest.reason ?? null,
      approvedById: insertLeaveRequest.approvedById ?? null,
      createdAt: new Date()
    };
    this.data.leaveRequests.push(leaveRequest);
    await this.saveData();
    return leaveRequest;
  }

  async updateLeaveRequest(id: number, leaveRequestData: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const index = this.data.leaveRequests.findIndex(l => l.id === id);
    if (index === -1) return undefined;
    
    const updatedLeaveRequest = { ...this.data.leaveRequests[index], ...leaveRequestData };
    this.data.leaveRequests[index] = updatedLeaveRequest;
    await this.saveData();
    return updatedLeaveRequest;
  }

  async deleteLeaveRequest(id: number): Promise<boolean> {
    const index = this.data.leaveRequests.findIndex(l => l.id === id);
    if (index === -1) return false;
    
    this.data.leaveRequests.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Holiday methods
  async getHoliday(id: number): Promise<Holiday | undefined> {
    return this.data.holidayRecords.find(h => h.id === id);
  }

  async getHolidays(): Promise<Holiday[]> {
    return this.data.holidayRecords;
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const id = this.data.currentHolidayId++;
    const holiday: Holiday = { 
      ...insertHoliday, 
      id,
      description: insertHoliday.description ?? null
    };
    this.data.holidayRecords.push(holiday);
    await this.saveData();
    return holiday;
  }

  async updateHoliday(id: number, holidayData: Partial<Holiday>): Promise<Holiday | undefined> {
    const index = this.data.holidayRecords.findIndex(h => h.id === id);
    if (index === -1) return undefined;
    
    const updatedHoliday = { ...this.data.holidayRecords[index], ...holidayData };
    this.data.holidayRecords[index] = updatedHoliday;
    await this.saveData();
    return updatedHoliday;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    const index = this.data.holidayRecords.findIndex(h => h.id === id);
    if (index === -1) return false;
    
    this.data.holidayRecords.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.data.notifications.find(n => n.id === id);
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return this.data.notifications
      .filter(notification => notification.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    return this.data.notifications
      .filter(notification => notification.userId === userId && !notification.isRead)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.data.currentNotificationId++;
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: insertNotification.isRead ?? false,
      createdAt: new Date(),
      relatedUserId: insertNotification.relatedUserId ?? null,
      relatedLeaveId: insertNotification.relatedLeaveId ?? null
    };
    this.data.notifications.push(notification);
    await this.saveData();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.data.notifications.find(n => n.id === id);
    if (!notification) return false;
    
    notification.isRead = true;
    await this.saveData();
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = this.data.notifications
      .filter(notification => notification.userId === userId && !notification.isRead);
    
    userNotifications.forEach(notification => {
      notification.isRead = true;
    });
    
    await this.saveData();
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const index = this.data.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    this.data.notifications.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Payment Record methods
  async getPaymentRecord(id: number): Promise<PaymentRecord | undefined> {
    return this.data.paymentRecords.find(pr => pr.id === id);
  }

  async getPaymentRecords(): Promise<PaymentRecord[]> {
    return [...this.data.paymentRecords];
  }

  async getPaymentRecordsByEmployee(employeeId: number): Promise<PaymentRecord[]> {
    return this.data.paymentRecords.filter(pr => pr.employeeId === employeeId);
  }

  async getPaymentRecordsByMonth(month: string): Promise<PaymentRecord[]> {
    return this.data.paymentRecords.filter(pr => pr.month === month);
  }

  async createPaymentRecord(paymentRecord: InsertPaymentRecord): Promise<PaymentRecord> {
    const id = this.data.currentPaymentRecordId++;
    const newPaymentRecord: PaymentRecord = {
      ...paymentRecord,
      id,
      createdAt: new Date(),
    };
    
    this.data.paymentRecords.push(newPaymentRecord);
    await this.saveData();
    return newPaymentRecord;
  }

  async updatePaymentRecord(id: number, paymentRecord: Partial<PaymentRecord>): Promise<PaymentRecord | undefined> {
    const index = this.data.paymentRecords.findIndex(pr => pr.id === id);
    if (index === -1) return undefined;
    
    this.data.paymentRecords[index] = { ...this.data.paymentRecords[index], ...paymentRecord };
    await this.saveData();
    return this.data.paymentRecords[index];
  }

  async deletePaymentRecord(id: number): Promise<boolean> {
    const index = this.data.paymentRecords.findIndex(pr => pr.id === id);
    if (index === -1) return false;
    
    this.data.paymentRecords.splice(index, 1);
    await this.saveData();
    return true;
  }
}