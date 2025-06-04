# ClinicBoost 🦷

AI-powered dental practice management system designed specifically for Moroccan clinics.

## 🌟 Features

### Core Functionality
- **Patient Management**: Complete CRUD operations with medical history tracking
- **Appointment Scheduling**: Advanced calendar with conflict detection and reminders
- **Billing & Invoicing**: Automated invoice generation with payment tracking
- **Campaign Management**: Automated patient communication and recall campaigns
- **Reporting & Analytics**: Comprehensive reports with data visualization
- **Multi-language Support**: Arabic, French, and English

### Advanced Features
- **Real-time Search**: Global search across patients, appointments, and invoices
- **Dark Mode**: Full dark/light theme support
- **Responsive Design**: Mobile-first design for all devices
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Toast Notifications**: Real-time user feedback system
- **Role-based Access**: Admin, staff, and billing user roles

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/clinicboost.git
   cd clinicboost
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Fill in your environment variables in `.env`

4. **Database Setup**
   ```bash
   # Run Supabase migrations
   npx supabase db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to see the application.

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Modal, etc.)
│   ├── patients/       # Patient-specific components
│   └── billing/        # Billing-specific components
├── pages/              # Page components
├── layouts/            # Layout components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
│   ├── api/           # API functions
│   └── supabase.ts    # Supabase client
├── utils/              # Helper functions
└── i18n/              # Internationalization
```

## 🔧 Configuration

### Environment Variables

Key environment variables you need to configure:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twilio (for SMS)
VITE_TWILIO_ACCOUNT_SID=your_twilio_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_token

# Stripe (for payments)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Database Schema

The application uses Supabase with the following main tables:
- `patients` - Patient information
- `appointments` - Appointment scheduling
- `treatments` - Treatment records
- `invoices` - Billing information
- `campaigns` - Marketing campaigns

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

### Deploy to Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

## 🔐 Security Features

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Validation**: Zod schema validation
- **Input Sanitization**: XSS protection
- **HTTPS**: Enforced in production
- **Environment Variables**: Secure configuration management

## 🌍 Internationalization

The application supports multiple languages:
- **English** (default)
- **Arabic** (RTL support)
- **French**

Add new translations in `src/i18n/locales/`

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Mobile-optimized navigation
- PWA capabilities (coming soon)

## 🔌 Integrations

### Current Integrations
- **Supabase**: Database and authentication
- **Twilio**: SMS and WhatsApp messaging
- **Stripe**: Payment processing
- **Azure AI**: Text analytics

### Planned Integrations
- **Google Calendar**: Calendar synchronization
- **Electronic Health Records (EHR)**
- **Insurance providers**
- **Email services**

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.clinicboost.com](https://docs.clinicboost.com)
- **Issues**: [GitHub Issues](https://github.com/your-username/clinicboost/issues)
- **Email**: support@clinicboost.com

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core patient management
- ✅ Basic appointment scheduling
- ✅ Invoice generation
- ✅ Multi-language support

### Phase 2 (Next)
- 🔄 Real-time notifications
- 🔄 Advanced reporting
- 🔄 Mobile app
- 🔄 API documentation

### Phase 3 (Future)
- 📋 EHR integration
- 📋 Telemedicine features
- 📋 AI-powered insights
- 📋 Multi-clinic support

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Supabase](https://supabase.com/) - Backend as a Service
- [Lucide React](https://lucide.dev/) - Icons
- [Recharts](https://recharts.org/) - Charts and graphs
