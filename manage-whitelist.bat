@echo off
REM Email Whitelist Management
REM Usage: manage-whitelist.bat [add|remove|list|check] [args...]

node scripts/manage-email-whitelist.mjs %*
