# Contributing to Map Drawing Application

Thank you for your interest in contributing to the Map Drawing Application! This document provides guidelines and instructions for contributing to this project. By following these guidelines, you'll help maintain consistency and quality in the codebase.

## Why This Document Exists

This contributing guide helps collaborators understand how to effectively participate in the project's development. It ensures that all contributions follow the same standards and processes, making collaboration smoother and more efficient.

## Setting Up Windsurf for Development

[Windsurf](https://windsurf.dev) is our recommended IDE for this project as it provides AI-assisted development through Cascade.

### Installation

1. Download and install Windsurf from the [official website](https://windsurf.dev)
2. Open Windsurf and select "Open Folder" to open the project directory
3. Windsurf will automatically detect the project structure and configure itself

### Configuring Windsurf

1. Enable the Python extension if not already enabled
2. Configure the Python interpreter to use your virtual environment:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
   - Type "Python: Select Interpreter"
   - Select the interpreter from your virtual environment

### Using Cascade for Development

Cascade is the AI assistant integrated with Windsurf. To use it effectively:

1. Access Cascade by clicking the Cascade icon in the sidebar or pressing `Ctrl+Shift+A`
2. Ask Cascade for help with:
   - Code generation
   - Debugging
   - Refactoring
   - Documentation
3. Cascade can understand the project context and provide relevant suggestions

## Development Workflow

1. **Fork the Repository**
   - Fork the repository to your GitHub account
   - Clone your fork locally

2. **Create a Branch**
   - Create a branch for your feature or bug fix
   - Use a descriptive name that reflects the purpose of your changes
   ```
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Write code following the coding standards (see below)
   - Add or update tests as necessary
   - Update documentation to reflect your changes

4. **Test Your Changes**
   - Run the existing test suite
   - Manually test your changes

5. **Commit Your Changes**
   - Write clear, concise commit messages
   - Reference issue numbers in your commit messages when applicable
   ```
   git commit -m "Add feature X (fixes #123)"
   ```

6. **Submit a Pull Request**
   - Push your branch to your fork
   ```
   git push origin feature/your-feature-name
   ```
   - Create a pull request from your branch to the main repository
   - Provide a clear description of the changes and their purpose

## Coding Standards

### Python

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide
- Use docstrings for all functions, classes, and modules
- Write meaningful variable and function names
- Keep functions focused on a single responsibility
- Add type hints where appropriate

### JavaScript

- Use ES6+ syntax where possible
- Follow a consistent indentation style (2 or 4 spaces)
- Use camelCase for variable and function names
- Add comments for complex logic
- Avoid global variables

### HTML/CSS

- Use semantic HTML elements
- Follow a consistent naming convention for CSS classes
- Keep CSS selectors as simple as possible
- Ensure responsive design for all UI components

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting a pull request
- Consider edge cases in your tests
- Document any manual testing steps if applicable

## Documentation

- Update README.md if your changes affect installation or usage
- Update CHANGELOG.md with a description of your changes
- Add or update inline documentation as needed
- Create or update wiki pages for significant features

## Questions?

If you have any questions about contributing, please open an issue or contact the project maintainers.

Thank you for contributing to the Map Drawing Application!
