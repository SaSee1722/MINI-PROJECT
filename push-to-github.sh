#!/bin/bash

# Smart Attendance App - GitHub Push Script
# This script helps you push your project to GitHub

echo "🚀 Smart Attendance App - GitHub Setup"
echo "========================================"
echo ""

# Check if git is configured
if ! git config user.name > /dev/null 2>&1; then
    echo "⚠️  Git user not configured. Let's set it up!"
    echo ""
    read -p "Enter your name: " git_name
    read -p "Enter your email: " git_email
    
    git config --global user.name "$git_name"
    git config --global user.email "$git_email"
    
    echo "✅ Git configured successfully!"
    echo ""
fi

# Get repository URL
echo "📝 Enter your GitHub repository URL"
echo "Example: https://github.com/yourusername/smart-attendance-app.git"
echo ""
read -p "Repository URL: " repo_url

# Validate URL
if [ -z "$repo_url" ]; then
    echo "❌ Error: Repository URL cannot be empty"
    exit 1
fi

echo ""
echo "🔄 Setting up remote repository..."

# Remove existing remote if any
git remote remove origin 2>/dev/null

# Add new remote
git remote add origin "$repo_url"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to add remote repository"
    exit 1
fi

echo "✅ Remote repository added"
echo ""

# Rename branch to main
echo "🔄 Renaming branch to main..."
git branch -M main
echo "✅ Branch renamed"
echo ""

# Push to GitHub
echo "🚀 Pushing to GitHub..."
echo "You may be asked for your GitHub credentials..."
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Success! Your project is now on GitHub!"
    echo ""
    echo "📍 Repository URL: $repo_url"
    echo ""
    echo "Next steps:"
    echo "1. Visit your repository on GitHub"
    echo "2. Update README.md with your information"
    echo "3. Add topics/tags to your repository"
    echo "4. Share your project!"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to push to GitHub"
    echo ""
    echo "Common issues:"
    echo "1. Check your GitHub credentials"
    echo "2. Make sure the repository exists on GitHub"
    echo "3. Verify you have write access to the repository"
    echo ""
    echo "For help, see GITHUB_SETUP.md"
fi
