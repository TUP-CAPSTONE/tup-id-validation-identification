# Quick setup script for team members
# Run this after pulling the branch: .\setup-env.ps1

Write-Host "Setting up environment variables..." -ForegroundColor Green

$envContent = @"
# Email Configuration for Verification Codes
# Dedicated thesis email credentials

# Your Gmail address
EMAIL_USER=siivs.tup@gmail.com

# Your Gmail App Password (NOT your regular Gmail password)
# Get this from: https://myaccount.google.com/apppasswords
# Must enable 2-Factor Authentication first
EMAIL_PASSWORD=iwfhpdjduketuvot
"@

Set-Content -Path ".env.local" -Value $envContent

Write-Host "✓ .env.local file created successfully!" -ForegroundColor Green
Write-Host "✓ Email credentials configured" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: npm run dev" -ForegroundColor Cyan
