// Script to add Indian corporate holidays to the database
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Indian Corporate Holidays for 2025-2027
const indianHolidays = [
  // 2025 Holidays
  { name: "New Year's Day", date: "2025-01-01", description: "Beginning of the Gregorian calendar year" },
  { name: "Republic Day", date: "2025-01-26", description: "Commemorates the adoption of the Constitution of India" },
  { name: "Maha Shivratri", date: "2025-02-26", description: "Hindu festival dedicated to Lord Shiva" },
  { name: "Holi", date: "2025-03-14", description: "Festival of Colors" },
  { name: "Good Friday", date: "2025-04-18", description: "Christian observance of the crucifixion of Jesus Christ" },
  { name: "Ram Navami", date: "2025-04-06", description: "Hindu festival celebrating the birth of Lord Rama" },
  { name: "Mahavir Jayanti", date: "2025-04-10", description: "Jain festival celebrating the birth of Lord Mahavira" },
  { name: "Buddha Purnima", date: "2025-05-12", description: "Celebrates the birth, enlightenment, and death of Buddha" },
  { name: "Eid al-Fitr", date: "2025-03-31", description: "Islamic festival marking the end of Ramadan" },
  { name: "Independence Day", date: "2025-08-15", description: "Commemorates India's independence from British rule" },
  { name: "Raksha Bandhan", date: "2025-08-09", description: "Hindu festival celebrating the bond between brothers and sisters" },
  { name: "Janmashtami", date: "2025-08-16", description: "Hindu festival celebrating the birth of Lord Krishna" },
  { name: "Ganesh Chaturthi", date: "2025-08-27", description: "Hindu festival honoring Lord Ganesha" },
  { name: "Gandhi Jayanti", date: "2025-10-02", description: "Birthday of Mahatma Gandhi" },
  { name: "Dussehra", date: "2025-10-02", description: "Hindu festival celebrating the victory of good over evil" },
  { name: "Karva Chauth", date: "2025-10-20", description: "Hindu festival of marital love and devotion" },
  { name: "Diwali", date: "2025-10-20", description: "Festival of Lights" },
  { name: "Bhai Dooj", date: "2025-11-03", description: "Hindu festival celebrating the bond between brothers and sisters" },
  { name: "Guru Nanak Jayanti", date: "2025-11-15", description: "Birthday of Guru Nanak, founder of Sikhism" },
  { name: "Christmas Day", date: "2025-12-25", description: "Christian festival celebrating the birth of Jesus Christ" },

  // 2026 Holidays
  { name: "New Year's Day", date: "2026-01-01", description: "Beginning of the Gregorian calendar year" },
  { name: "Republic Day", date: "2026-01-26", description: "Commemorates the adoption of the Constitution of India" },
  { name: "Maha Shivratri", date: "2026-02-17", description: "Hindu festival dedicated to Lord Shiva" },
  { name: "Holi", date: "2026-03-03", description: "Festival of Colors" },
  { name: "Good Friday", date: "2026-04-03", description: "Christian observance of the crucifixion of Jesus Christ" },
  { name: "Ram Navami", date: "2026-03-25", description: "Hindu festival celebrating the birth of Lord Rama" },
  { name: "Mahavir Jayanti", date: "2026-03-29", description: "Jain festival celebrating the birth of Lord Mahavira" },
  { name: "Buddha Purnima", date: "2026-05-01", description: "Celebrates the birth, enlightenment, and death of Buddha" },
  { name: "Eid al-Fitr", date: "2026-03-20", description: "Islamic festival marking the end of Ramadan" },
  { name: "Independence Day", date: "2026-08-15", description: "Commemorates India's independence from British rule" },
  { name: "Raksha Bandhan", date: "2026-07-29", description: "Hindu festival celebrating the bond between brothers and sisters" },
  { name: "Janmashtami", date: "2026-08-05", description: "Hindu festival celebrating the birth of Lord Krishna" },
  { name: "Ganesh Chaturthi", date: "2026-08-17", description: "Hindu festival honoring Lord Ganesha" },
  { name: "Gandhi Jayanti", date: "2026-10-02", description: "Birthday of Mahatma Gandhi" },
  { name: "Dussehra", date: "2026-09-21", description: "Hindu festival celebrating the victory of good over evil" },
  { name: "Karva Chauth", date: "2026-10-09", description: "Hindu festival of marital love and devotion" },
  { name: "Diwali", date: "2026-11-08", description: "Festival of Lights" },
  { name: "Bhai Dooj", date: "2026-11-10", description: "Hindu festival celebrating the bond between brothers and sisters" },
  { name: "Guru Nanak Jayanti", date: "2026-11-04", description: "Birthday of Guru Nanak, founder of Sikhism" },
  { name: "Christmas Day", date: "2026-12-25", description: "Christian festival celebrating the birth of Jesus Christ" },

  // 2027 Holidays
  { name: "New Year's Day", date: "2027-01-01", description: "Beginning of the Gregorian calendar year" },
  { name: "Republic Day", date: "2027-01-26", description: "Commemorates the adoption of the Constitution of India" },
  { name: "Maha Shivratri", date: "2027-03-07", description: "Hindu festival dedicated to Lord Shiva" },
  { name: "Holi", date: "2027-03-22", description: "Festival of Colors" },
  { name: "Good Friday", date: "2027-03-26", description: "Christian observance of the crucifixion of Jesus Christ" },
  { name: "Ram Navami", date: "2027-04-13", description: "Hindu festival celebrating the birth of Lord Rama" },
  { name: "Mahavir Jayanti", date: "2027-04-17", description: "Jain festival celebrating the birth of Lord Mahavira" },
  { name: "Buddha Purnima", date: "2027-05-20", description: "Celebrates the birth, enlightenment, and death of Buddha" },
  { name: "Eid al-Fitr", date: "2027-03-09", description: "Islamic festival marking the end of Ramadan" },
  { name: "Independence Day", date: "2027-08-15", description: "Commemorates India's independence from British rule" },
  { name: "Raksha Bandhan", date: "2027-08-17", description: "Hindu festival celebrating the bond between brothers and sisters" },
  { name: "Janmashtami", date: "2027-08-24", description: "Hindu festival celebrating the birth of Lord Krishna" },
  { name: "Ganesh Chaturthi", date: "2027-09-06", description: "Hindu festival honoring Lord Ganesha" },
  { name: "Gandhi Jayanti", date: "2027-10-02", description: "Birthday of Mahatma Gandhi" },
  { name: "Dussehra", date: "2027-10-11", description: "Hindu festival celebrating the victory of good over evil" },
  { name: "Karva Chauth", date: "2027-10-27", description: "Hindu festival of marital love and devotion" },
  { name: "Diwali", date: "2027-10-29", description: "Festival of Lights" },
  { name: "Bhai Dooj", date: "2027-10-31", description: "Hindu festival celebrating the bond between brothers and sisters" },
  { name: "Guru Nanak Jayanti", date: "2027-11-24", description: "Birthday of Guru Nanak, founder of Sikhism" },
  { name: "Christmas Day", date: "2027-12-25", description: "Christian festival celebrating the birth of Jesus Christ" }
];

// Function to add holidays to the data file
function addIndianHolidays() {
  try {
    const dataPath = join(__dirname, '../data/hr-data.json');
    let data;
    
    try {
      const fileContent = readFileSync(dataPath, 'utf-8');
      data = JSON.parse(fileContent);
    } catch (error) {
      console.log('Creating new data file...');
      data = {
        users: [],
        departments: [],
        attendanceRecords: [],
        leaveRequests: [],
        holidayRecords: [],
        notifications: [],
        currentUserId: 1,
        currentDepartmentId: 1,
        currentAttendanceId: 1,
        currentLeaveRequestId: 1,
        currentHolidayId: 1,
        currentNotificationId: 1,
      };
    }

    // Get existing holiday names to avoid duplicates
    const existingHolidayNames = new Set(
      data.holidayRecords.map(h => `${h.name}-${h.date.split('T')[0]}`)
    );

    // Add new holidays
    let addedCount = 0;
    indianHolidays.forEach(holiday => {
      const holidayKey = `${holiday.name}-${holiday.date}`;
      if (!existingHolidayNames.has(holidayKey)) {
        const newHoliday = {
          id: data.currentHolidayId++,
          name: holiday.name,
          date: new Date(holiday.date).toISOString(),
          description: holiday.description
        };
        data.holidayRecords.push(newHoliday);
        addedCount++;
      }
    });

    // Sort holidays by date
    data.holidayRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Save updated data
    writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Successfully added ${addedCount} Indian corporate holidays to the database.`);
    console.log(`Total holidays in database: ${data.holidayRecords.length}`);
    
  } catch (error) {
    console.error('Error adding holidays:', error);
  }
}

// Run the script
addIndianHolidays();