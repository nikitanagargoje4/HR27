import { 
  User, InsertUser, Department, InsertDepartment, 
  Attendance, InsertAttendance, LeaveRequest, InsertLeaveRequest,
  Holiday, InsertHoliday, Notification, InsertNotification,
  PaymentRecord, InsertPaymentRecord
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User/Employee methods
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersByDepartment(departmentId: number): Promise<User[]>;
  
  // Department methods
  getDepartment(id: number): Promise<Department | undefined>;
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<Department>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;
  
  // Attendance methods
  getAttendance(id: number): Promise<Attendance | undefined>;
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAttendanceByDate(date: Date): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<Attendance>): Promise<Attendance | undefined>;
  
  // Leave methods
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  getLeaveRequestsByUser(userId: number): Promise<LeaveRequest[]>;
  getPendingLeaveRequests(): Promise<LeaveRequest[]>;
  createLeaveRequest(leaveRequest: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, leaveRequest: Partial<LeaveRequest>): Promise<LeaveRequest | undefined>;
  deleteLeaveRequest(id: number): Promise<boolean>;
  
  // Holiday methods
  getHoliday(id: number): Promise<Holiday | undefined>;
  getHolidays(): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<Holiday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<boolean>;
  
  // Notification methods
  getNotification(id: number): Promise<Notification | undefined>;
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  getUnreadNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  deleteNotification(id: number): Promise<boolean>;
  
  // Payment record methods
  getPaymentRecord(id: number): Promise<PaymentRecord | undefined>;
  getPaymentRecords(): Promise<PaymentRecord[]>;
  getPaymentRecordsByEmployee(employeeId: number): Promise<PaymentRecord[]>;
  getPaymentRecordsByMonth(month: string): Promise<PaymentRecord[]>;
  createPaymentRecord(paymentRecord: InsertPaymentRecord): Promise<PaymentRecord>;
  updatePaymentRecord(id: number, paymentRecord: Partial<PaymentRecord>): Promise<PaymentRecord | undefined>;
  deletePaymentRecord(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private departments: Map<number, Department>;
  private attendanceRecords: Map<number, Attendance>;
  private leaveRequests: Map<number, LeaveRequest>;
  private holidayRecords: Map<number, Holiday>;
  private notifications: Map<number, Notification>;
  private paymentRecords: Map<number, PaymentRecord>;
  
  currentUserId: number;
  currentDepartmentId: number;
  currentAttendanceId: number;
  currentLeaveRequestId: number;
  currentHolidayId: number;
  currentNotificationId: number;
  currentPaymentRecordId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.departments = new Map();
    this.attendanceRecords = new Map();
    this.leaveRequests = new Map();
    this.holidayRecords = new Map();
    this.notifications = new Map();
    this.paymentRecords = new Map();
    
    this.currentUserId = 1;
    this.currentDepartmentId = 1;
    this.currentAttendanceId = 1;
    this.currentLeaveRequestId = 1;
    this.currentHolidayId = 1;
    this.currentNotificationId = 1;
    this.currentPaymentRecordId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with sample departments
    this.createDepartment({ 
      name: "Human Resources", 
      description: "Manages employee relations, hiring, and company policies" 
    });
    this.createDepartment({ 
      name: "Engineering", 
      description: "Software development and technical operations" 
    });
    this.createDepartment({ 
      name: "Marketing", 
      description: "Handles brand awareness and promotional activities" 
    });
    this.createDepartment({ 
      name: "Finance", 
      description: "Manages financial planning and accounting" 
    });
    
    // Initialize with users for each role with pre-hashed passwords
    // Passwords are hashed in the same format as hashPassword in auth.ts
    
    // Admin user - Password: admin123
    this.initializeUser({
      id: 1,
      username: "admin",
      password: "c56a7d8799d79a96bd917d2aea44a92cd3525c4313b14bf45467e40ee4a5b4b4b2d9cab3fe0aac89a56a4c00060a28226ef445e9969fce314e41a9fffd1b3ff4.6a2da20943931e46",
      email: "admin@hrconnect.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      departmentId: 1,
      position: "HR Director",
      phoneNumber: "123-456-7890",
      address: "123 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true,
      customPermissions: []
    });
    
    // HR user - Password: hr123
    this.initializeUser({
      id: 2,
      username: "hr",
      password: "4ed0c57d4e5b87cd80d3a2060e82c30e6e8cddea45e9655bd2eb471192c1e8bb6e7a15d7f8134c04dcbe56f5ee49b249f38a63ddcd4d81a64ca0c8c06aa67154.b1d6f9fdf91e77c8",
      email: "hr@hrconnect.com",
      firstName: "HR",
      lastName: "Manager",
      role: "hr",
      departmentId: 1,
      position: "HR Manager",
      phoneNumber: "123-456-7891",
      address: "124 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true,
      customPermissions: []
    });
    
    // Manager user - Password: manager123
    this.initializeUser({
      id: 3,
      username: "manager",
      password: "f064cc778f9ee67f2a3b2d8a7a0e4a8f06e1b12e7d68b1cb0b5c87ca3ad13cefc8e22f3bb8a0d9f5ce78ca28ba9ecc20889c27b20e93917545a85979fc92987.9a3992ad0c5f4ce2",
      email: "manager@hrconnect.com",
      firstName: "Department",
      lastName: "Manager",
      role: "manager",
      departmentId: 2,
      position: "Engineering Manager",
      phoneNumber: "123-456-7892",
      address: "125 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true,
      customPermissions: []
    });
    
    // Regular employee - Password: employee123
    this.initializeUser({
      id: 4,
      username: "employee",
      password: "2d8e6f2a8dd8c5ec52e499bbc1415cff0ea8af36aca4cac16d8bcbe5c967f0cbf5af81f0c1b5ce23b1b7122dea5562d7c1b83d66a5d76deb7f092ab7df283e4.ba4b61d276ab9d68",
      email: "employee@hrconnect.com",
      firstName: "Regular",
      lastName: "Employee",
      role: "employee",
      departmentId: 2,
      position: "Software Developer",
      phoneNumber: "123-456-7893",
      address: "126 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true,
      customPermissions: []
    });
  }
  
  // For initializing users with pre-hashed passwords
  private initializeUser(user: User) {
    this.users.set(user.id, user);
    if (user.id >= this.currentUserId) {
      this.currentUserId = user.id + 1;
    }
    return user;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      joinDate: new Date(),
      isActive: true,
      role: insertUser.role || 'employee',
      departmentId: insertUser.departmentId ?? null,
      position: insertUser.position ?? null,
      phoneNumber: insertUser.phoneNumber ?? null,
      address: insertUser.address ?? null,
      customPermissions: insertUser.customPermissions ?? []
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getUsersByDepartment(departmentId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.departmentId === departmentId,
    );
  }

  // Department methods
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async getDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const id = this.currentDepartmentId++;
    const department: Department = { 
      ...insertDepartment, 
      id,
      description: insertDepartment.description ?? null
    };
    this.departments.set(id, department);
    return department;
  }

  async updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined> {
    const department = this.departments.get(id);
    if (!department) return undefined;
    
    const updatedDepartment = { ...department, ...departmentData };
    this.departments.set(id, updatedDepartment);
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    return this.departments.delete(id);
  }

  // Attendance methods
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.attendanceRecords.get(id);
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return Array.from(this.attendanceRecords.values()).filter(
      (record) => record.userId === userId,
    );
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    const dateString = date.toDateString();
    return Array.from(this.attendanceRecords.values()).filter(
      (record) => new Date(record.date!).toDateString() === dateString,
    );
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = this.currentAttendanceId++;
    const attendance: Attendance = { 
      ...insertAttendance, 
      id,
      date: insertAttendance.date ?? null,
      status: insertAttendance.status ?? 'present',
      checkInTime: insertAttendance.checkInTime ?? null,
      checkOutTime: insertAttendance.checkOutTime ?? null,
      notes: insertAttendance.notes ?? null
    };
    this.attendanceRecords.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const attendance = this.attendanceRecords.get(id);
    if (!attendance) return undefined;
    
    const updatedAttendance = { ...attendance, ...attendanceData };
    this.attendanceRecords.set(id, updatedAttendance);
    return updatedAttendance;
  }

  // Leave methods
  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    return this.leaveRequests.get(id);
  }

  async getLeaveRequestsByUser(userId: number): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(
      (request) => request.userId === userId,
    );
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(
      (request) => request.status === 'pending',
    );
  }

  async createLeaveRequest(insertLeaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = this.currentLeaveRequestId++;
    const leaveRequest: LeaveRequest = { 
      ...insertLeaveRequest, 
      id,
      status: insertLeaveRequest.status ?? 'pending',
      reason: insertLeaveRequest.reason ?? null,
      approvedById: insertLeaveRequest.approvedById ?? null,
      createdAt: new Date()
    };
    this.leaveRequests.set(id, leaveRequest);
    return leaveRequest;
  }

  async updateLeaveRequest(id: number, leaveRequestData: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const leaveRequest = this.leaveRequests.get(id);
    if (!leaveRequest) return undefined;
    
    const updatedLeaveRequest = { ...leaveRequest, ...leaveRequestData };
    this.leaveRequests.set(id, updatedLeaveRequest);
    return updatedLeaveRequest;
  }

  async deleteLeaveRequest(id: number): Promise<boolean> {
    return this.leaveRequests.delete(id);
  }

  // Holiday methods
  async getHoliday(id: number): Promise<Holiday | undefined> {
    return this.holidayRecords.get(id);
  }

  async getHolidays(): Promise<Holiday[]> {
    return Array.from(this.holidayRecords.values());
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const id = this.currentHolidayId++;
    const holiday: Holiday = { 
      ...insertHoliday, 
      id,
      description: insertHoliday.description ?? null
    };
    this.holidayRecords.set(id, holiday);
    return holiday;
  }

  async updateHoliday(id: number, holidayData: Partial<Holiday>): Promise<Holiday | undefined> {
    const holiday = this.holidayRecords.get(id);
    if (!holiday) return undefined;
    
    const updatedHoliday = { ...holiday, ...holidayData };
    this.holidayRecords.set(id, updatedHoliday);
    return updatedHoliday;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    return this.holidayRecords.delete(id);
  }

  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: insertNotification.isRead ?? false,
      createdAt: new Date(),
      relatedUserId: insertNotification.relatedUserId ?? null,
      relatedLeaveId: insertNotification.relatedLeaveId ?? null
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    const updatedNotification = { ...notification, isRead: true };
    this.notifications.set(id, updatedNotification);
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = Array.from(this.notifications.entries())
      .filter(([_, notification]) => notification.userId === userId && !notification.isRead);
    
    userNotifications.forEach(([id, notification]) => {
      const updatedNotification = { ...notification, isRead: true };
      this.notifications.set(id, updatedNotification);
    });
    
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // Payment Record methods  
  async getPaymentRecord(id: number): Promise<PaymentRecord | undefined> {
    return this.paymentRecords.get(id);
  }

  async getPaymentRecords(): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values());
  }

  async getPaymentRecordsByEmployee(employeeId: number): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values()).filter(pr => pr.employeeId === employeeId);
  }

  async getPaymentRecordsByMonth(month: string): Promise<PaymentRecord[]> {
    return Array.from(this.paymentRecords.values()).filter(pr => pr.month === month);
  }

  async createPaymentRecord(paymentRecord: InsertPaymentRecord): Promise<PaymentRecord> {
    const id = this.currentPaymentRecordId++;
    const newPaymentRecord: PaymentRecord = {
      ...paymentRecord,
      id,
      createdAt: new Date(),
    };
    
    this.paymentRecords.set(id, newPaymentRecord);
    return newPaymentRecord;
  }

  async updatePaymentRecord(id: number, paymentRecord: Partial<PaymentRecord>): Promise<PaymentRecord | undefined> {
    const existing = this.paymentRecords.get(id);
    if (!existing) return undefined;
    
    const updatedRecord = { ...existing, ...paymentRecord };
    this.paymentRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  async deletePaymentRecord(id: number): Promise<boolean> {
    return this.paymentRecords.delete(id);
  }
}

import { FileStorage } from "./file-storage";

export const storage = new FileStorage();

// Initialize the file storage
storage.initialize().catch(console.error);