---
layout: post
section-type: post
title: Microsoft Word Templates Batch Update
category: Microsoft
tags: [ 'Powershell' ]
---

Ten years ago, a customer started using a Microsoft Word template for all sales quotations that he used.  The blank file he opened and saved as separated by year.  This caused a directory structure that contained thousands of files.  After migrating to a new server, with a new name and folder structure, every one of these files caused Word to freeze when opening.

### Attached Templates ###

The word documents were telling word to open a template off the server that no longer existed.  The solution is simple enough, just press ESC to cancel the request to the server, open the developer tab and select an accessible template.  Once you save the file, everything works.  This was a good solution for the blank file that was generating all the new quotes.  What about the existing files?

### Powershell COM Objects

PowerShell allows the .NET framework and installed programs with COM access to be programatically manipulated using built in Windows Tools.  [MSDN](https://msdn.microsoft.com/en-us/powershell/scripting/getting-started/cookbooks/creating-.net-and-com-objects--new-object-) has some information on the New-Object cmdlet that all this functionality stems from.  In my use case I am modifying a Visual Basic Script - [Batch Template Changes](http://wordribbon.tips.net/T010338_Batch_Template_Changes.html) - to PowerShell.

### Word COM Object Instanciation

    $word=New-Object -ComObject Word.Application

I am assigning a variable to the COM object.  By default, the application will not be visible on the screen (this will help performance).  Once I am done using Word, I exit the program:

    $word.quit()

### Walking the Directory

Recursing a directory is childs play in PowerShell:

    Get-childItem "C:\QUOTETEMP" -Recurse -Filter *.doc |
        Foreach-Object {
        	$doc = $word.documents.open($_.FullName)

We want only *.doc files in the Quotetemp and subfolders.  The pipe allows us to perform an action on the children.  Use the $_ perl like variable to access the file.

### Powershell Regular Expression

I also want to only change the files that currenly have their template saved on a server.  Regular Expressions are easy too:

            if ($doc.AttachedTemplate.FullName -match '\\\\\w') {

We want only to change documents that begin with two back slashes (which are special RegEx characters so they need to be escaped with an additional back slash)

## The Complete script

    $word=New-Object -ComObject Word.Application
    $updated = 0

    Get-childItem "C:\QUOTETEMP" -Recurse -Filter *.doc |
        Foreach-Object {
            $doc = $word.documents.open($_.FullName)
            if ($doc.AttachedTemplate.FullName -match '\\\\\w') {
                $doc.AttachedTemplate = "normal.dotm"
                $updated++
                $doc.save()
                }
            $doc.Close()
            }
    Write-Host $updated "Files Changed"
    $word.quit()