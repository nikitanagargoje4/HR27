import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertDepartmentSchema, 
  insertAttendanceSchema, 
  updateAttendanceSchema,
  insertLeaveRequestSchema, 
  insertHolidaySchema 
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Department routes
  app.get("/api/departments", async (req, res, next) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/departments/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const department = await storage.getDepartment(id);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/departments", async (req, res, next) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/departments/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, validatedData);
      
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/departments/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDepartment(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Department not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Employee/User routes
  app.get("/api/employees", async (req, res, next) => {
    try {
      const users = await storage.getUsers();
      // Don't expose passwords in response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/employees/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Don't expose password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/employees/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      // Password updates should be handled separately
      const { password, ...updateData } = req.body;
      
      const user = await storage.updateUser(id, updateData);
      
      if (!user) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // Don't expose password
      const { password: userPassword, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/employees/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Change password endpoint
  app.put("/api/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      const user = await storage.getUserByUsername(req.user.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if current password is correct using the same logic as authentication
      let isCurrentPasswordValid = false;
      
      // First, check hardcoded credentials (for users still using default passwords)
      if (
        (user.username === 'admin' && currentPassword === 'admin123') ||
        (user.username === 'hr' && currentPassword === 'hr123') ||
        (user.username === 'manager' && currentPassword === 'manager123') ||
        (user.username === 'employee' && currentPassword === 'employee123')
      ) {
        isCurrentPasswordValid = true;
      } else {
        // Otherwise, check against stored hashed password
        try {
          const scryptAsync = promisify(crypto.scrypt);
          const [hash, salt] = user.password.split('.');
          const keyBuffer = Buffer.from(hash, 'hex');
          const derivedKey = (await scryptAsync(currentPassword, salt, 64)) as Buffer;
          isCurrentPasswordValid = crypto.timingSafeEqual(keyBuffer, derivedKey);
        } catch (error) {
          console.error('Error verifying stored password:', error);
          isCurrentPasswordValid = false;
        }
      }
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const scryptAsync = promisify(crypto.scrypt);
      const newSalt = crypto.randomBytes(16).toString('hex');
      const newHashBuffer = (await scryptAsync(newPassword, newSalt, 64)) as Buffer;
      const newHashedPassword = newHashBuffer.toString('hex') + '.' + newSalt;

      // Update password
      await storage.updateUser(user.id, { password: newHashedPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Update user permissions endpoint
  app.patch("/api/users/permissions", async (req, res, next) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Only admin users can modify permissions" });
      }

      const { userId, role, customPermissions } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ message: "userId and role are required" });
      }

      const updatedUser = await storage.updateUser(userId, {
        role,
        customPermissions: customPermissions || []
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't expose password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/departments/:departmentId/employees", async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const employees = await storage.getUsersByDepartment(departmentId);
      
      // Don't expose passwords
      const employeesWithoutPasswords = employees.map(({ password, ...employee }) => employee);
      res.json(employeesWithoutPasswords);
    } catch (error) {
      next(error);
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req, res, next) => {
    try {
      const { userId, date } = req.query;
      
      if (userId) {
        const records = await storage.getAttendanceByUser(parseInt(userId as string));
        return res.json(records);
      }
      
      if (date) {
        const records = await storage.getAttendanceByDate(new Date(date as string));
        return res.json(records);
      }
      
      // If no parameters provided, return all attendance records for overview
      const allRecords = await storage.getAllAttendance();
      res.json(allRecords);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/attendance", async (req, res, next) => {
    try {
      const validatedData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/attendance/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      console.log("=== ATTENDANCE UPDATE DEBUG ===");
      console.log("ID:", id);
      console.log("Raw body:", JSON.stringify(req.body, null, 2));
      console.log("Body type:", typeof req.body);
      console.log("Keys in body:", Object.keys(req.body));
      
      // Completely bypass any validation - just update directly
      const result = await storage.updateAttendance(id, req.body);
      
      if (!result) {
        console.log("No attendance record found with ID:", id);
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      console.log("Update successful:", result);
      console.log("=== END DEBUG ===");
      
      res.json(result);
    } catch (error) {
      console.log("=== ERROR ===");
      console.log("Error type:", typeof error);
      console.log("Error constructor:", error?.constructor?.name);
      console.log("Error message:", (error as any)?.message);
      console.log("Full error:", error);
      console.log("=== END ERROR ===");
      
      return res.status(500).json({ 
        message: "Internal server error", 
        error: (error as any)?.message || "Unknown error" 
      });
    }
  });

  app.post("/api/attendance/check-in", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const now = new Date();
      
      // Check if user has already checked in today
      const todayRecords = await storage.getAttendanceByDate(now);
      const userTodayRecord = todayRecords.find(record => record.userId === userId);
      
      if (userTodayRecord && userTodayRecord.checkInTime) {
        return res.status(400).json({ message: "Already checked in today" });
      }
      
      const attendance = await storage.createAttendance({
        userId,
        checkInTime: now,
        date: now,
        status: 'present',
        notes: ''
      });
      
      res.status(201).json(attendance);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/attendance/check-out", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      const now = new Date();
      
      // Find today's check-in record
      const todayRecords = await storage.getAttendanceByDate(now);
      const userTodayRecord = todayRecords.find(record => record.userId === userId);
      
      if (!userTodayRecord) {
        return res.status(404).json({ message: "No check-in record found for today" });
      }
      
      if (userTodayRecord.checkOutTime) {
        return res.status(400).json({ message: "Already checked out today" });
      }
      
      const attendance = await storage.updateAttendance(userTodayRecord.id, {
        checkOutTime: now
      });
      
      res.json(attendance);
    } catch (error) {
      next(error);
    }
  });

  // Leave request routes
  app.get("/api/leave-requests", async (req, res, next) => {
    try {
      const { userId, status } = req.query;
      
      if (userId) {
        const requests = await storage.getLeaveRequestsByUser(parseInt(userId as string));
        return res.json(requests);
      }
      
      if (status === 'pending') {
        const requests = await storage.getPendingLeaveRequests();
        return res.json(requests);
      }
      
      // If no query params, return all requests (for admins/HR)
      if (req.user && (req.user.role === 'admin' || req.user.role === 'hr')) {
        const requests = await storage.getPendingLeaveRequests();
        return res.json(requests);
      }
      
      res.status(400).json({ message: "Missing query parameters or insufficient permissions" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/leave-requests", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Set userId from authenticated user if not specified and convert dates
      const data = {
        ...req.body,
        userId: req.body.userId || req.user.id,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate)
      };
      
      const validatedData = insertLeaveRequestSchema.parse(data);
      const leaveRequest = await storage.createLeaveRequest(validatedData);
      
      // Create notification for leave request submission
      try {
        await storage.createNotification({
          userId: leaveRequest.userId,
          type: 'leave_request',
          title: 'Leave Request Submitted',
          message: `Your leave request from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been submitted and is pending approval.`,
          isRead: false,
          relatedLeaveId: leaveRequest.id
        });
        
        // Notify admins about new leave request
        const adminUsers = await storage.getAdminUsers();
        const employee = await storage.getUser(leaveRequest.userId);
        for (const admin of adminUsers) {
          await storage.createNotification({
            userId: admin.id,
            type: 'leave_request',
            title: 'New Leave Request',
            message: `${employee?.firstName} ${employee?.lastName} has submitted a leave request from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} for ${leaveRequest.type} leave.`,
            isRead: false,
            relatedLeaveId: leaveRequest.id,
            relatedUserId: leaveRequest.userId
          });
        }
      } catch (notificationError) {
        console.error('Failed to create leave request notification:', notificationError);
      }
      
      res.status(201).json(leaveRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/leave-requests/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Convert dates if they exist in the request body
      const data = { ...req.body };
      if (data.startDate) {
        data.startDate = new Date(data.startDate);
      }
      if (data.endDate) {
        data.endDate = new Date(data.endDate);
      }
      
      // For approvals, set the approver ID
      if (data.status === 'approved' && req.isAuthenticated()) {
        data.approvedById = req.user.id;
      }
      
      const validatedData = insertLeaveRequestSchema.partial().parse(data);
      const leaveRequest = await storage.updateLeaveRequest(id, validatedData);
      
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      // Create notification for leave status updates
      if (data.status && (data.status === 'approved' || data.status === 'rejected')) {
        try {
          const statusTitle = data.status === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected';
          const statusMessage = data.status === 'approved' 
            ? `Your leave request from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been approved.`
            : `Your leave request from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been rejected.`;
            
          await storage.createNotification({
            userId: leaveRequest.userId,
            type: data.status === 'approved' ? 'leave_approved' : 'leave_rejected',
            title: statusTitle,
            message: statusMessage,
            isRead: false,
            relatedLeaveId: leaveRequest.id,
            relatedUserId: req.user?.id
          });
        } catch (notificationError) {
          console.error('Failed to create leave status notification:', notificationError);
        }
      }
      
      res.json(leaveRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/leave-requests/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get the leave request first to check ownership
      const leaveRequest = await storage.getLeaveRequest(id);
      
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      // Users can only cancel their own requests, or admins/HR can cancel any
      if (leaveRequest.userId !== req.user.id && 
          req.user.role !== 'admin' && 
          req.user.role !== 'hr') {
        return res.status(403).json({ message: "You can only cancel your own leave requests" });
      }
      
      // Only allow cancellation of pending requests
      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({ message: "Only pending leave requests can be canceled" });
      }
      
      const deleted = await storage.deleteLeaveRequest(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      
      // Create notification for canceled leave request
      try {
        await storage.createNotification({
          userId: leaveRequest.userId,
          type: 'leave_request',
          title: 'Leave Request Canceled',
          message: `Your leave request from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been canceled.`,
          isRead: false,
          relatedLeaveId: leaveRequest.id
        });
      } catch (notificationError) {
        console.error('Failed to create leave cancellation notification:', notificationError);
      }
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Holiday routes
  app.get("/api/holidays", async (req, res, next) => {
    try {
      const holidays = await storage.getHolidays();
      res.json(holidays);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/holidays", async (req, res, next) => {
    try {
      // Convert date string to Date object before validation
      const bodyWithDateConversion = {
        ...req.body,
        date: new Date(req.body.date)
      };
      
      const validatedData = insertHolidaySchema.parse(bodyWithDateConversion);
      const holiday = await storage.createHoliday(validatedData);
      res.status(201).json(holiday);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/holidays/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      
      // Convert date string to Date object before validation if date is provided
      const bodyWithDateConversion = {
        ...req.body,
        ...(req.body.date && { date: new Date(req.body.date) })
      };
      
      const validatedData = insertHolidaySchema.partial().parse(bodyWithDateConversion);
      const holiday = await storage.updateHoliday(id, validatedData);
      
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      res.json(holiday);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/holidays/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHoliday(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Reports routes
  app.get("/api/reports/attendance", async (req, res, next) => {
    try {
      const { startDate, endDate, departmentId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Get all attendance records
      const allUsers = await storage.getUsers();
      const allAttendance = [];
      
      // Filter users by department if specified
      let users = allUsers;
      if (departmentId) {
        users = allUsers.filter(user => user.departmentId === parseInt(departmentId as string));
      }
      
      // Build report data
      for (const user of users) {
        const userAttendance = await storage.getAttendanceByUser(user.id);
        const filteredAttendance = userAttendance.filter(record => {
          const recordDate = record.date ? new Date(record.date) : null;
          return recordDate && recordDate >= start && recordDate <= end;
        });
        
        if (filteredAttendance.length > 0) {
          allAttendance.push({
            user: { 
              id: user.id, 
              firstName: user.firstName, 
              lastName: user.lastName,
              position: user.position,
              departmentId: user.departmentId
            },
            records: filteredAttendance
          });
        }
      }
      
      res.json(allAttendance);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/reports/leave", async (req, res, next) => {
    try {
      const { startDate, endDate, departmentId, status } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Get all users
      const allUsers = await storage.getUsers();
      const leaveReport = [];
      
      // Filter users by department if specified
      let users = allUsers;
      if (departmentId) {
        users = allUsers.filter(user => user.departmentId === parseInt(departmentId as string));
      }
      
      // Build report data
      for (const user of users) {
        const userLeaveRequests = await storage.getLeaveRequestsByUser(user.id);
        
        // Filter by date range and status if specified
        let filteredRequests = userLeaveRequests.filter(request => {
          const requestStart = new Date(request.startDate);
          const requestEnd = new Date(request.endDate);
          return (requestStart >= start && requestStart <= end) || 
                 (requestEnd >= start && requestEnd <= end);
        });
        
        if (status) {
          filteredRequests = filteredRequests.filter(request => request.status === status);
        }
        
        if (filteredRequests.length > 0) {
          leaveReport.push({
            user: { 
              id: user.id, 
              firstName: user.firstName, 
              lastName: user.lastName,
              position: user.position,
              departmentId: user.departmentId
            },
            leaveRequests: filteredRequests
          });
        }
      }
      
      res.json(leaveReport);
    } catch (error) {
      next(error);
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const notifications = await storage.getNotificationsByUser(req.user.id);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications/unread", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const unreadNotifications = await storage.getUnreadNotificationsByUser(req.user.id);
      res.json(unreadNotifications);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/notifications", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const notification = await storage.createNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/notifications/:id/read", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const success = await storage.markNotificationAsRead(id);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/notifications/read-all", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await storage.markAllNotificationsAsRead(req.user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/notifications/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const success = await storage.deleteNotification(id);
      
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Payment record routes
  app.get("/api/payment-records", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { employeeId, month } = req.query;
      
      if (employeeId) {
        const records = await storage.getPaymentRecordsByEmployee(parseInt(employeeId as string));
        return res.json(records);
      }
      
      if (month) {
        const records = await storage.getPaymentRecordsByMonth(month as string);
        return res.json(records);
      }
      
      const records = await storage.getPaymentRecords();
      res.json(records);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/payment-records", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const paymentRecord = await storage.createPaymentRecord(req.body);
      res.status(201).json(paymentRecord);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/payment-records/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const updatedRecord = await storage.updatePaymentRecord(id, req.body);
      
      if (!updatedRecord) {
        return res.status(404).json({ message: "Payment record not found" });
      }

      res.json(updatedRecord);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/payment-records/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const success = await storage.deletePaymentRecord(id);
      
      if (!success) {
        return res.status(404).json({ message: "Payment record not found" });
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Settings routes
  const SETTINGS_FILE_PATH = path.join(process.cwd(), 'data', 'system-settings.json');

  // Helper function to read settings from JSON file
  const readSettings = async () => {
    try {
      const data = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Return default settings if file doesn't exist
      return {
        organizationName: "HR Connect",
        organizationEmail: "admin@hrconnect.com",
        timeZone: "Asia/Kolkata",
        dateFormat: "DD/MM/YYYY",
        workingHours: {
          start: "09:00",
          end: "18:00"
        },
        notifications: {
          email: true,
          push: true,
          attendance: true,
          leave: true
        }
      };
    }
  };

  // Helper function to write settings to JSON file
  const writeSettings = async (settings: any) => {
    try {
      await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing settings:', error);
      return false;
    }
  };

  // Get system settings
  app.get("/api/settings/system", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only admin users can access system settings
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const settings = await readSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  // Update system settings
  app.put("/api/settings/system", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Only admin users can update system settings
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const success = await writeSettings(req.body);
      if (!success) {
        return res.status(500).json({ message: "Failed to save settings" });
      }

      res.json({ message: "Settings updated successfully", data: req.body });
    } catch (error) {
      next(error);
    }
  });

  // Update user profile
  app.put("/api/user/profile", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { firstName, lastName, email, phone, address, department } = req.body;
      
      // Update user profile data
      const updateData: any = {
        firstName,
        lastName,
        email,
      };

      if (phone) updateData.phoneNumber = phone;
      if (address) updateData.address = address;
      if (department) updateData.departmentId = parseInt(department);

      const updatedUser = await storage.updateUser(req.user.id, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't expose password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Change password
  app.post("/api/user/change-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      const user = await storage.getUserByUsername(req.user.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Import password functions from auth
      const { comparePasswords, hashPassword } = await import("./auth");
      
      // Verify current password
      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(req.user.id, { password: hashedNewPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
