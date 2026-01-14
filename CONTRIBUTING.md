# Contributing to Kaspa University

Thank you for your interest in contributing to Kaspa University! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Reporting Issues](#reporting-issues)
7. [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. We expect everyone to:

- Be respectful and considerate
- Use welcoming and inclusive language
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or personal attacks
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

## Getting Started

### Prerequisites

- Node.js v20+
- PostgreSQL 14+
- Git
- A code editor (VS Code recommended)

### Setting Up Development Environment

1. **Fork the repository**
   
   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/kaspa-university.git
   cd kaspa-university
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/kaspa-university.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/dark-mode-toggle`)
- `fix/` - Bug fixes (e.g., `fix/quiz-scoring-bug`)
- `docs/` - Documentation changes (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/wallet-context`)
- `test/` - Adding tests (e.g., `test/quiz-validation`)

### Creating a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in small, focused commits
2. Write clear commit messages
3. Add tests for new functionality
4. Update documentation as needed

### Commit Message Format

```
type(scope): brief description

[optional body with more details]

[optional footer with references]
```

Examples:
```
feat(quiz): add retry limit for failed attempts

Implement a 3-attempt limit for quiz retries to prevent abuse.
After 3 failed attempts, user must wait 24 hours.

Closes #123
```

```
fix(wallet): handle disconnection during transaction

Previously, wallet disconnection mid-transaction caused
an unhandled error. Now gracefully catches and notifies user.
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` if needed

```typescript
// Good
interface QuizResult {
  lessonId: string;
  score: number;
  passed: boolean;
}

// Avoid
const result: any = { ... };
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Use custom hooks for shared logic
- Follow the existing file structure

```typescript
// Good - focused component
export function QuizScore({ score, maxScore }: QuizScoreProps) {
  const percentage = Math.round((score / maxScore) * 100);
  return <span>{percentage}%</span>;
}

// Avoid - doing too much
export function QuizComponent() {
  // 500 lines of mixed concerns
}
```

### Styling

- Use Tailwind CSS classes
- Follow the design system in `design_guidelines.md`
- Use semantic color variables (not hardcoded colors)
- Ensure dark mode compatibility

```tsx
// Good
<div className="bg-card text-foreground border-border">

// Avoid
<div className="bg-white text-black border-gray-200">
```

### API Routes

- Use RESTful conventions
- Validate all inputs with Zod
- Return consistent error formats
- Add rate limiting for public endpoints

```typescript
// Good
app.post("/api/quiz/:lessonId/submit", async (req, res) => {
  const validation = quizSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.message });
  }
  // ...
});
```

### Database

- Use Drizzle ORM for all database operations
- Add indexes for frequently queried columns
- Use transactions for related operations
- Never write raw SQL except for debugging

### Testing

- Write tests for new features
- Maintain existing test coverage
- Use descriptive test names

```typescript
describe("Quiz Scoring", () => {
  it("should calculate percentage score correctly", () => {
    expect(calculateScore(8, 10)).toBe(80);
  });

  it("should mark as passed when score >= 70%", () => {
    expect(isPassing(70)).toBe(true);
    expect(isPassing(69)).toBe(false);
  });
});
```

## Pull Request Process

### Before Submitting

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**
   ```bash
   npm test
   ```

3. **Check linting**
   ```bash
   npm run lint
   ```

4. **Build successfully**
   ```bash
   npm run build
   ```

### Submitting a PR

1. Push your branch to your fork
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request on GitHub

3. Fill out the PR template:
   - Description of changes
   - Related issues
   - Screenshots (for UI changes)
   - Testing done

### PR Review

- Address reviewer feedback promptly
- Keep discussions focused and professional
- Request re-review after making changes
- Squash commits if requested

### Merging

- PRs require at least one approval
- All CI checks must pass
- Branch must be up to date with main
- Maintainers will merge approved PRs

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots or error logs

### Feature Requests

Include:
- Clear description of the feature
- Use case and motivation
- Proposed implementation (optional)
- Alternatives considered

### Security Issues

For security vulnerabilities, please email security@kaspauniversity.com instead of creating a public issue.

## Community

### Getting Help

- GitHub Discussions for questions
- Discord for real-time chat
- Stack Overflow with `kaspa-university` tag

### Staying Updated

- Watch the repository for notifications
- Join our Discord community
- Follow [@KaspaUniversity](https://twitter.com/KaspaUniversity)

### Recognition

Contributors are recognized in:
- README contributors section
- Release notes
- Community spotlights

## License

By contributing, you agree that your contributions will be licensed under the same ISC License that covers the project.

---

Thank you for contributing to Kaspa University! Your efforts help build the future of blockchain education.
