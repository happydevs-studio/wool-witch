# Contributing to Wool Witch

Thank you for your interest in contributing to Wool Witch! This guide will help you get started with development and contribution.

## 🚀 Demo Setup (1 Minute)

**Just want to see the app running?**

```bash
git clone https://github.com/dataGriff/wool-witch.git
cd wool-witch
npm install && npm start
```

✨ Visit <http://localhost:5173> - you're running Wool Witch!

*This gives you the frontend only with sample data - perfect for UI/design work.*

## 🛠️ Full Development Setup (5 Minutes)

**Ready to contribute with full database and backend access?**

### Prerequisites

Before starting, ensure you have:

- **Node.js** (>= 18.0.0)
- **Docker Desktop** (running)
- **Git**

### Setup Steps

1. **Install Task runner** (recommended for best experience):

   ```bash
   # macOS
   brew install go-task
   
   # Ubuntu/Debian  
   sudo snap install task --classic
   
   # Universal (any OS)
   sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin
   export PATH="$HOME/.local/bin:$PATH"
   ```

2. **Run complete setup:**

   ```bash
   task setup && task dev
   ```

3. **Start developing!** You now have:
   - 🌐 **Web App**: <http://localhost:5173>
   - 📊 **Database Admin**: <http://localhost:54323>
   - 🔌 **API**: <http://localhost:54321>
   - 📧 **Email Testing**: <http://localhost:54324>

**First run downloads Docker images (~2-5 minutes). Subsequent runs take ~30 seconds.**

### Alternative: Without Task Runner

If you prefer not to install Task:

```bash
git clone https://github.com/YOUR_USERNAME/wool-witch.git
cd wool-witch
npm install
# Set up environment
npm run setup:env
# Start database (requires Docker)
supabase start
# Start development server
npm run dev
```

[Full development guide ↓](#full-development-environment)

## 📋 Quick Contribution Checklist

Before submitting:

- [ ] `npm run test` passes (or `task test`)
- [ ] Code follows style guide  
- [ ] Added tests if needed
- [ ] Updated docs if needed
- [ ] Clear commit messages
- [ ] PR description explains changes

[Detailed guidelines ↓](#detailed-contribution-process)

---

## Full Development Environment

### Development Prerequisites

Ensure these are installed and running:

- **Node.js** (>= 18.0.0) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker Desktop** - [Download here](https://docs.docker.com/get-docker/)
  - ⚠️ **Must be running** before setup
  - Verify with: `docker ps` (should list containers)
- **Git** - [Download here](https://git-scm.com/downloads)
- **Supabase CLI** (installed automatically by setup)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/wool-witch.git
   cd wool-witch
   ```

3. **Add upstream remote:**

   ```bash
   git remote add upstream https://github.com/dataGriff/wool-witch.git
   ```

4. **Complete setup:**

   ```bash
   task setup
   ```

   This command:
   - ✅ Installs all dependencies (`npm install`)
   - ✅ Creates `.env.local` with local Supabase config
   - ✅ Checks prerequisites (Node.js, Docker)
   - ✅ Installs Supabase CLI if needed

5. **Start developing:**

   ```bash
   task dev
   ```

   This command:
   - 🚀 Starts local Supabase (database, auth, storage)
   - 🔥 Starts Vite dev server with hot reload
   - 📊 Opens Supabase Studio for database management

**First run takes 2-5 minutes** (downloads Docker images). Subsequent runs take ~30 seconds.

### Your Development Environment

Once running, you'll have access to:

- 🌐 **Web App**: <http://localhost:5173>
- 📊 **Database Admin (Supabase Studio)**: <http://localhost:54323>
- 🔌 **API**: <http://localhost:54321>
- 📧 **Email Testing**: <http://localhost:54324>

### Testing Authentication Features

The app includes authentication with role-based access:

1. **Sign up** a new user through the app UI
2. **Promote to admin** (to test admin features):
   - Open Supabase Studio: <http://localhost:54323>
   - Go to Table Editor → `user_roles`
   - Change your user's role from 'user' to 'admin'
   - Sign out and back in to refresh permissions

See [docs/AUTHENTICATION_SETUP.md](docs/AUTHENTICATION_SETUP.md) for detailed authentication testing.

## Detailed Contribution Process

### Creating a New Feature

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

**Branch naming conventions:**

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `refactor/` - Code refactoring

### Code Quality

**Run these commands frequently during development:**

```bash
# Run linting and type checking
task test

# Auto-fix linting issues
task lint:fix

# Build to check for build errors
task build
```

**Code quality tools:**

- **ESLint** - Code quality and style
- **TypeScript** - Type safety
- **Prettier** - Code formatting (auto-configured)

### Database Development

**Create a new migration:**

```bash
task db:migration:new -- add_new_feature
```

**Reset database (fresh start):**

```bash
task db:reset
```

**Check database status:**

```bash
task db:status
```

### Testing Your Changes

1. **Test the application** thoroughly in the browser
2. **Run quality checks:**

   ```bash
   task test  # linting + type checking
   ```

3. **Test the build:**

   ```bash
   task build  # production build
   ```

## 📝 Submitting Your Contribution

### Before Submitting

1. **Update your branch** with the latest changes:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all quality checks pass:**

   ```bash
   task test
   task build
   ```

3. **Push to your fork:**

   ```bash
   git push origin your-branch-name
   ```

4. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what was added/changed/fixed
   - Screenshots for UI changes
   - Reference to any related issues

5. **Respond to review feedback** promptly

### Pull Request Checklist

- [ ] Code follows the project's style guidelines
- [ ] All tests pass (`task test`)
- [ ] Build succeeds (`task build`)
- [ ] No new linting errors
- [ ] Added/updated documentation if needed
- [ ] Tested the changes locally
- [ ] Clear commit messages
- [ ] PR description explains the changes

## 🏗️ Project Structure

```text
wool-witch/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Application pages
│   ├── contexts/       # React contexts
│   ├── lib/           # Utilities and configurations
│   └── types/         # TypeScript type definitions
├── supabase/
│   └── migrations/    # Database migrations
├── public/           # Static assets
└── docs/            # Documentation
```

## 🛠️ Available Commands

All commands use [Task](https://taskfile.dev/). If you don't have Task installed, you can run the underlying npm scripts directly.

### Essential Commands

```bash
# Initial setup (run once)
task setup      

# Daily development
task dev        # Start everything (database + dev server)
task dev-only   # Start dev server only (if database already running)

# Quality assurance
task test       # Run linting + type checking
task build      # Test production build

# Database management
task db:start   # Start database only
task db:stop    # Stop database
task db:reset   # Reset database (fresh start)
```

**Alternative npm commands** (if not using Task):

- `npm start` - Quick frontend-only development
- `npm run test` - Quality checks
- `npm run build` - Production build

### Database Commands

```bash
task db:start   # Start database only
task db:stop    # Stop database
task db:reset   # Reset database (fresh start)
task db:status  # Check database status
task db:migrate # Apply pending migrations
```

### Quality Commands

```bash
task lint       # Run linter
task lint:fix   # Auto-fix linting issues
task typecheck  # Type checking
```

### Other Commands

```bash
task clean      # Clean build artifacts
task preview    # Preview production build
task --list     # See all available commands
```

## 🚨 Troubleshooting

### Common Issues

**Docker not running:**

```bash
# Make sure Docker Desktop is started
docker ps  # Should list containers
```

**Port already in use:**

```bash
# Stop and restart
task db:stop
task dev
```

**Database won't start:**

```bash
# Complete reset
task db:stop
task clean:db
task dev
```

**Node modules issues:**

```bash
# Clean and reinstall
task clean
task setup
```

### Getting Help

- 📖 Check existing [Issues](https://github.com/dataGriff/wool-witch/issues)
- 💬 Create a new issue for bugs or questions
- 📧 Contact maintainers if needed

## 📋 Issue Templates

### Bug Reports

Please include:

- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, etc.)

### Feature Requests

Please include:

- Check if the feature has already been suggested
- Clear description of the feature
- Use case and benefits
- Possible implementation approach

## 🏷️ Coding Standards

- **TypeScript**: Strict mode enabled
- **React**: Function components with hooks
- **Styling**: Tailwind CSS classes
- **Imports**: Absolute imports from `src/`
- **Naming**: camelCase for variables, PascalCase for components
- **Files**: kebab-case for file names

## 🙏 Thank You

Every contribution helps make Wool Witch better for the crafting community. Thank you for taking the time to contribute!
