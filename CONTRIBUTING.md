# Contributing to Wool Witch

Thank you for your interest in contributing to Wool Witch! This document provides guidelines and instructions for contributing to the project.

## 🌟 Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:
- Node.js (>= 18.0.0)
- npm or yarn
- [Task](https://taskfile.dev/) (recommended)
- Git
- A Supabase account

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**
```bash
git clone https://github.com/YOUR_USERNAME/wool-witch.git
cd wool-witch
```

3. **Add upstream remote:**
```bash
git remote add upstream https://github.com/dataGrif/wool-witch.git
```

4. **Set up the project:**
```bash
task setup  # or npm install
```

5. **Create a `.env` file** with your Supabase credentials (see README.md)

6. **Start the development server:**
```bash
task dev  # or npm run dev
```

## 🔄 Development Workflow

### Creating a Branch

Always create a new branch for your work:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

### Making Changes

1. **Make your changes** in small, logical commits
2. **Run quality checks** frequently:
```bash
task test  # Runs lint and typecheck
# or
npm run lint && npm run typecheck
```

3. **Test your changes** locally:
```bash
task dev    # Start dev server
task build  # Ensure it builds successfully
```

### Code Style

We use ESLint and TypeScript for code quality:

- **Run linter:**
```bash
task lint  # or npm run lint
```

- **Auto-fix issues:**
```bash
task lint:fix  # or npm run lint -- --fix
```

- **Type checking:**
```bash
task typecheck  # or npm run typecheck
```

### Commit Messages

Follow these guidelines for commit messages:

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests liberally

Examples:
```
Add shopping cart persistence feature

Fix layout issue on mobile devices

Update README with installation instructions

Refactor product card component for better reusability
```

## 📝 Pull Request Process

1. **Update your branch** with the latest upstream changes:
```bash
git fetch upstream
git rebase upstream/main
```

2. **Ensure all checks pass:**
```bash
task test
task build
```

3. **Push to your fork:**
```bash
git push origin your-branch-name
```

4. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference any related issues
   - Screenshots for UI changes
   - List of changes made

5. **Respond to review feedback** promptly

### Pull Request Checklist

Before submitting, ensure:
- [ ] Code follows the project's style guidelines
- [ ] All tests pass (`task test`)
- [ ] Build succeeds (`task build`)
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear and descriptive
- [ ] No unnecessary files are included
- [ ] `.env` file is not committed

## 🧪 Testing

Currently, the project uses:
- ESLint for code quality
- TypeScript for type checking

Run all checks:
```bash
task test  # or npm run lint && npm run typecheck
```

## 📋 Project Structure

```
wool-witch/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts
│   ├── lib/           # Utility functions and configurations
│   ├── pages/         # Page components
│   ├── types/         # TypeScript type definitions
│   └── App.tsx        # Main app component
├── supabase/
│   └── migrations/    # Database migrations
├── public/            # Static assets
├── Taskfile.yml       # Task runner configuration
└── package.json       # Project dependencies
```

## 🐛 Reporting Bugs

When reporting bugs, please include:
- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, Node version)

## 💡 Suggesting Features

We welcome feature suggestions! Please:
- Check if the feature has already been suggested
- Provide a clear use case
- Explain the expected benefit
- Consider including mockups or examples

## 📚 Documentation

Good documentation is crucial. When contributing:
- Update README.md for user-facing changes
- Update this CONTRIBUTING.md for process changes
- Add comments for complex code logic
- Update TypeScript types and interfaces

## 🔒 Security

If you discover a security vulnerability:
- **DO NOT** open a public issue
- Email the maintainers directly
- Provide detailed information about the vulnerability

## 📞 Getting Help

If you need help:
- Check existing documentation
- Search existing issues
- Open a new issue with the "question" label
- Be specific about what you're trying to do

## 🙏 Recognition

Contributors will be recognized in:
- The project's contributor list
- Release notes for significant contributions

Thank you for contributing to Wool Witch! 🧶✨
