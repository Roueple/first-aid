@echo off
REM Bulk Email Whitelist Import
REM Usage: bulk-add-emails.bat [file] [added-by]

node scripts/bulk-add-emails.mjs %*
