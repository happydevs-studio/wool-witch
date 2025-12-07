# Contributing to Wool Witch

Thank you for your interest in contributing to Wool Witch! This guide will help you get started with development and contribution.

## 🚀 5-Minute Start (No Tools Required)

**Just want to try it quickly?**

```bash
git clone https://github.com/dataGriff/wool-witch.git
cd wool-witch
npm install && npm run start
```

Visit <http://localhost:5173> - you're running Wool Witch!

## 🛠️ Full Development Setup

**Ready to contribute seriously?**

1. **Install Task runner** (optional but recommended):

   ```bash
   # macOS
   brew install go-task
   
   # Ubuntu/Debian  
   sudo snap install task --classic
   
   # Or use official script
   curl -sL https://taskfile.dev/install.sh | sh
   ```

2. **Run full setup:**

   ```bash
   task setup && task dev
   ```

3. **Start coding!** You'll have:
   - 🌐 **Web App**: <http://localhost:5173>
   - 📊 **Database Admin**: <http://localhost:54323>
   - 🔌 **API**: <http://localhost:54321>

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

### Prerequisites

Before you begin, ensure you have:

- Node.js (>= 18.0.0)
- npm
- [Docker Desktop](https://docs.docker.com/get-docker/) (for local database)
- Git

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
   - ✅ Installs all dependencies
   - ✅ Sets up environment files  
   - ✅ Checks prerequisites
   - ✅ Prepares the database

5. **Start developing:**

   ```bash
   task dev
   ```

   This starts both the database and development server.

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
task setup      # First-time setup (run once)
task dev        # Start development environment
task dev-only   # Start dev server only (if DB already running)
task test       # Run quality checks (lint + typecheck)
task build      # Build for production
```

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
