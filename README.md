# 🧶 Wool Witch

A modern e-commerce web application for handmade crochet and craft goods, built with React, TypeScript, and Supabase.

## 🌟 Features

- Browse handcrafted crochet products
- Shopping cart functionality
- Checkout process
- Responsive design with Tailwind CSS
- Real-time data with Supabase backend
- Type-safe development with TypeScript

## 🚀 Quick Start

### Prerequisites

- Node.js (>= 18.0.0)
- npm or yarn
- [Task](https://taskfile.dev/) (optional but recommended for easier development)
- Supabase account (for backend services)

### Installation

#### Using Task (Recommended)

1. Install Task: https://taskfile.dev/installation/

2. Clone the repository:
```bash
git clone https://github.com/dataGrif/wool-witch.git
cd wool-witch
```

3. Run setup:
```bash
task setup
```

4. Configure environment variables (see [Configuration](#configuration))

5. Start development server:
```bash
task dev
```

#### Using npm

1. Clone the repository:
```bash
git clone https://github.com/dataGrif/wool-witch.git
cd wool-witch
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (see [Configuration](#configuration))

4. Start development server:
```bash
npm run dev
```

## ⚙️ Configuration

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**How to get Supabase credentials:**
1. Go to https://app.supabase.com/
2. Create a new project or select an existing one
3. Navigate to Settings → API
4. Copy the Project URL and anon/public key

## 🛠️ Development

### Available Task Commands

If you have Task installed, you can use these convenient commands:

```bash
task                # List all available tasks
task install        # Install dependencies
task dev            # Start development server
task build          # Build for production
task preview        # Preview production build
task lint           # Run linter
task lint:fix       # Run linter and fix issues
task typecheck      # Run TypeScript type checking
task test           # Run all quality checks
task clean          # Remove all build artifacts and dependencies
task clean:dist     # Remove only build artifacts
task setup          # First-time setup
task ci             # Run all CI checks
```

### Available npm Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript type checking
```

## 📦 Building for Production

### Using Task
```bash
task build
```

### Using npm
```bash
npm run build
```

The built files will be in the `dist/` directory.

## 🧪 Quality Checks

Run all quality checks before committing:

### Using Task
```bash
task test
```

### Using npm
```bash
npm run lint
npm run typecheck
```

## 🗄️ Database Setup

This project uses Supabase for the backend. Database migrations are located in `supabase/migrations/`.

To set up the database:
1. Create a Supabase project
2. Run the migrations in your Supabase SQL editor
3. Configure the environment variables as described above

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License

This project is part of a personal portfolio. Please contact the repository owner for licensing information.

## 🐛 Troubleshooting

### "Missing Supabase environment variables" error
Make sure you've created a `.env` file with valid Supabase credentials.

### Build fails with type errors
Run `task typecheck` or `npm run typecheck` to see detailed type errors.

### Development server won't start
1. Remove `node_modules` and reinstall: `task clean && task install`
2. Check that port 5173 (default Vite port) is not in use

## 📞 Support

For issues and questions, please open an issue on GitHub.