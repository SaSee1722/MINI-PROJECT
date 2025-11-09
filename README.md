# 🎓 Smart Attendance App

A modern, feature-rich attendance management system built with React, Vite, and Supabase. Designed for educational institutions to efficiently track and manage student and staff attendance with an intuitive interface.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![Vite](https://img.shields.io/badge/Vite-5.x-646cff.svg)
![Supabase](https://img.shields.io/badge/Supabase-Latest-3ecf8e.svg)

---

## ✨ Features

### 📊 Attendance Management
- **Period-wise Attendance** - Mark attendance for each period/class
- **Interactive Timetable** - Visual weekly timetable with click-to-mark functionality
- **Alternative Staff Support** - Allow substitute teachers to mark attendance
- **Approval System** - Approve/unapprove student absences
- **Real-time Updates** - Instant attendance status updates

### 👥 User Management
- **Role-based Access** - Admin, Staff, and Student roles
- **Secure Authentication** - Email/password authentication via Supabase
- **User Profiles** - Comprehensive user information management
- **Department & Year Tracking** - Organize by departments and academic years

### 📈 Reports & Analytics
- **PDF Reports** - Generate detailed attendance reports
- **Visual Indicators** - Color-coded status for easy scanning
- **Alternative Staff Tracking** - See who marked attendance
- **Attendance Statistics** - Present, absent, and on-duty counts

### 🎨 Modern UI/UX
- **Professional Design** - Clean, modern interface
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Dark Theme** - Eye-friendly dark mode
- **Smooth Animations** - Polished user experience
- **Custom Logo System** - Professional branding

### 🔧 Additional Features
- **Bulk Import** - Import students via CSV
- **Timetable Management** - Create and manage class schedules
- **Student Status** - Track intern and suspended students
- **Session Management** - Organize by academic sessions
- **Department Overview** - Quick stats and insights

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-attendance-app.git
   cd smart-attendance-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   - Go to your Supabase project
   - Run the SQL migrations from `docs/sql-migrations/COMPLETE_MIGRATION.sql`
   - Or run individual migrations in order

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:5173
   ```

---

## 📚 Documentation

All documentation is organized in the `docs/` folder:

- **[Quick Start Guide](docs/setup-guides/QUICK_START.md)** - Get started in 5 minutes
- **[Alternative Staff Feature](docs/alternative-staff-feature/SETUP_ALTERNATIVE_STAFF.md)** - Setup guide
- **[SQL Migrations](docs/sql-migrations/)** - Database setup files
- **[Features Documentation](docs/features/)** - Detailed feature guides
- **[Authentication Guide](docs/authentication/)** - Auth setup and usage

👉 **Start here:** [DOCUMENTATION.md](DOCUMENTATION.md)

---

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Real-time subscriptions

### Additional Libraries
- **jsPDF** - PDF generation
- **jsPDF-AutoTable** - Table formatting for PDFs
- **date-fns** - Date manipulation

---

## 📁 Project Structure

```
smart-attendance-app/
├── src/
│   ├── components/          # Reusable React components
│   ├── context/            # React Context (Auth, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── services/           # API services (Supabase)
│   ├── utils/              # Utility functions
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── docs/                   # Documentation
│   ├── alternative-staff-feature/
│   ├── sql-migrations/
│   ├── setup-guides/
│   ├── features/
│   └── ...
├── public/                 # Static assets
├── .env.example           # Environment variables template
├── package.json           # Dependencies
└── README.md             # This file
```

---

## 🎯 Key Features Explained

### Alternative Staff Feature
When a regular teacher is absent, any staff member can mark attendance as an "alternative staff" member. The system tracks who actually marked the attendance, and reports clearly show this information with visual indicators.

**[Learn more →](docs/alternative-staff-feature/SETUP_ALTERNATIVE_STAFF.md)**

### Interactive Timetable
Click on any period in the weekly timetable to mark attendance. The system shows which periods are marked, pending, or empty with color-coded indicators.

**[Learn more →](docs/features/INTERACTIVE_TIMETABLE_SETUP.md)**

### Approval System
Admins can approve or unapprove student absences. Approved absences are marked in green, unapproved in orange, making it easy to track attendance status.

**[Learn more →](docs/features/APPROVAL_STATUS_FEATURE.md)**

---

## 🔐 Security

- **Row Level Security (RLS)** - Database-level access control
- **Role-based Access** - Different permissions for admin, staff, and students
- **Secure Authentication** - Supabase Auth with email/password
- **Environment Variables** - Sensitive data stored securely
- **Input Validation** - Client and server-side validation

---

## 📊 Database Schema

The application uses PostgreSQL (via Supabase) with the following main tables:

- `users` - User accounts and profiles
- `departments` - Academic departments
- `classes` - Class/section information
- `students` - Student records
- `timetable` - Class schedules
- `period_attendance` - Period-wise attendance records
- `period_student_attendance` - Individual student attendance
- `staff_attendance` - Staff attendance records

**Full schema:** [docs/sql-migrations/database-schema.sql](docs/sql-migrations/database-schema.sql)

---

## 🎨 Screenshots

### Landing Page
Modern, professional landing page with smooth animations and clear call-to-action.

### Staff Dashboard
Interactive timetable with period-wise attendance marking and real-time updates.

### Admin Dashboard
Comprehensive overview with statistics, user management, and report generation.

### Reports
Professional PDF reports with color-coded status and alternative staff indicators.

---

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Netlify
1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Configure environment variables

### Manual Deployment
```bash
npm run build
# Upload the dist/ folder to your hosting provider
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)

---

## 📞 Support

For support, email your.email@example.com or open an issue in the GitHub repository.

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Biometric attendance
- [ ] Parent portal
- [ ] Advanced analytics dashboard
- [ ] Export to Excel
- [ ] Multi-language support

---

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

**Made with ❤️ for educational institutions**
