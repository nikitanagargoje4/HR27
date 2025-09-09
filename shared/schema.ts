import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role enum for role-based access control
export const roleEnum = pgEnum('role', ['admin', 'hr', 'manager', 'employee']);

// Department schema
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  description: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Gender enum
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'prefer_not_to_say']);

// Account type enum
export const accountTypeEnum = pgEnum('account_type', ['savings', 'current', 'salary']);

// User/Employee schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  gender: genderEnum("gender"),
  photoUrl: text("photo_url"),
  role: roleEnum("role").notNull().default('employee'),
  departmentId: integer("department_id").references(() => departments.id),
  position: text("position"),
  joinDate: timestamp("join_date").defaultNow(),
  phoneNumber: text("phone_number"),
  address: text("address"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolderName: text("bank_account_holder_name"),
  bankName: text("bank_name"),
  bankIFSCCode: text("bank_ifsc_code"),
  bankAccountType: accountTypeEnum("bank_account_type"),
  salary: integer("salary"),
  isActive: boolean("is_active").default(true),
  customPermissions: text("custom_permissions").array(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  photoUrl: true,
  role: true,
  departmentId: true,
  position: true,
  joinDate: true,
  phoneNumber: true,
  address: true,
  bankAccountNumber: true,
  bankAccountHolderName: true,
  bankName: true,
  bankIFSCCode: true,
  bankAccountType: true,
  salary: true,
  customPermissions: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Attendance schema
export const attendanceRecords = pgTable("attendance_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  checkInTime: timestamp("check_in_time").defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  date: timestamp("date").defaultNow(),
  status: text("status").notNull().default('present'), // present, absent, late
  notes: text("notes"),
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).pick({
  userId: true,
  checkInTime: true,
  checkOutTime: true,
  date: true,
  status: true,
  notes: true,
});

// Create a specific schema for updating attendance records
export const updateAttendanceSchema = z.object({
  checkInTime: z.date().optional(),
  checkOutTime: z.date().optional(),
  date: z.date().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type UpdateAttendance = z.infer<typeof updateAttendanceSchema>;
export type Attendance = typeof attendanceRecords.$inferSelect;

// Leave types enum
export const leaveTypeEnum = pgEnum('leave_type', ['annual', 'sick', 'personal', 'halfday', 'unpaid', 'other']);

// Leave request status enum
export const leaveStatusEnum = pgEnum('leave_status', ['pending', 'approved', 'rejected']);

// Leave requests schema
export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: leaveTypeEnum("type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default('pending'),
  approvedById: integer("approved_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).pick({
  userId: true,
  type: true,
  startDate: true,
  endDate: true,
  reason: true,
  status: true,
  approvedById: true,
});

export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

// Holidays schema
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
});

export const insertHolidaySchema = createInsertSchema(holidays).pick({
  name: true,
  date: true,
  description: true,
});

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

// Notification type enum
export const notificationTypeEnum = pgEnum('notification_type', ['login', 'logout', 'leave_request', 'leave_approved', 'leave_rejected']);

// Notifications schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  relatedUserId: integer("related_user_id").references(() => users.id),
  relatedLeaveId: integer("related_leave_id").references(() => leaveRequests.id),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  relatedUserId: true,
  relatedLeaveId: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Payment status enum
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid']);

// Payment mode enum
export const paymentModeEnum = pgEnum('payment_mode', ['bank_transfer', 'cheque', 'cash', 'upi']);

// Payment records schema
export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => users.id),
  month: text("month").notNull(), // Format: "MMM yyyy" e.g., "Jan 2025"
  paymentStatus: paymentStatusEnum("payment_status").notNull().default('pending'),
  amount: integer("amount").notNull(),
  paymentDate: timestamp("payment_date"),
  paymentMode: paymentModeEnum("payment_mode"),
  referenceNo: text("reference_no"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).pick({
  employeeId: true,
  month: true,
  paymentStatus: true,
  amount: true,
  paymentDate: true,
  paymentMode: true,
  referenceNo: true,
});

export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
