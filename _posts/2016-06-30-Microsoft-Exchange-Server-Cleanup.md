---
layout: post
section-type: post
title: Microsoft Exchange Server Cleanup
category: Microsoft
tags: [ 'Powershell' ]
---

To move Microsoft Exchange from one server to another, such as an upgrade, migration, or replacement, both exchange servers will co-exist in the organization as mailboxes are moved and Client Access Roles are switched.  After the new server has the OWA firewall configured, and the users have been migrated, it is time to cleanup the old server.

### Remove Mailbox Database ###

Using Exchange Shell, we have access to Powershell cmdlets for Administering Exchange.  The Remove-MailboxDatabase cmdlet will report if a database is ready for removal by using the WhatIf flag.  Assuming the old server is named `OLDSERVER` which hosts a database `OLDDB` and `NEWSERVER` hosts `NEWDB` the command to determine the readiness of removing `OLDSERVER` from the organization would look like this:

    Get-MailboxDatabase -Server OLDSERVER | Remove-MailboxDatabase -WhatIf

Generally, this will be the result:

  > This mailbox database contains one or more mailboxes, mailbox plans, archive mailboxes, public folder mailboxes or arbitration mailboxes.

Let's take each of these, one at a time:

#### Mailboxes ####

To migrate all the mailboxes that are on the old database, the following command finds the mailboxes and creates a move request:

    Get-Mailbox -Database OLDDB | New-MoveRequest -TargetDatabase NEWDB

New-MoveRequest cmdlet creates an asynchronous move.  To monitor the progress of the move (including all additional move requests outlined here) use the Get-MoveRequest syntax:

    Get-MoveRequest -TargetDatabase NEWDB

The option -MoveStatus InProgress may also be beneficial if there are many mailboxes that must move.

#### Mailbox Plans #### 

These are cloud based templates.  When using on-premise Exchange these should not be present.  If you are migrating from Office 365 you won't be using this guide, but here is the command that would help:

    Get-MailboxPlan

#### Archive Mailboxes ####

Exchange 2010 allowed the server to host archive mailboxes to prevent loss of this mail.  Due to PST size limitations, the archive paradigm had users shifting mail from their primary inbox and into an archive, usually through auto-archive to keep their mailbox size within limits.  Server storage got cheaper, and lawsuits got more expensive.  The need to retain these emails outweigh the cost of holding them.  To move archive mailboxes append the flag `-Archive`

    Get-Mailbox -Database OLDDB -Archive | New-MoveRequest -TargetDatabase NEWDB

#### Public Folders ####

Public folders are accessible to everyone by default, and are easier to administer than sharing calendars and contacts when the information is not sensitive.  Public room availability, customers, and important shared e-mails are good things to turn into a public folder.  There is a lot of hype about them, but Microsoft has affirmed they are here to stay.  Instead of existing in a separate database (and different information schema), Public Folders now are held neatly in a Mailbox that can be easily moved from database to database:

    Get-Mailbox -Database OLDDB -PublicFolder | New-MoveRequest -TargetDatabase NEWDB

#### Arbitration Mailbox ####

Organization wide information is held in Arbitration Mailboxes.  The information includes search metadata, audit logs, menus, greetings, unified messaging, AD integration information.  These mailboxes are generally not seen unless something is failing.  Make sure these mailboxes are moved before turning that Exchange server off.  Offline Address Book generation exists here.

    Get-Mailbox -Database OLDDB -Arbitration | New-MoveRequest -TargetDatabase NEWDB

#### Finally Remove the Mailbox Database

Once all these mailboxes are moved to the new server/database, remove the whatif command and remove the MailboxDatabase:

    Get-MailboxDatabase -Server OLDSERVER | Remove-MailboxDatabase

  
### Remove CAS and Server from Organization

In order to remove roles from Exchange 2013, the entire software must be removed.  Use add/remove programs `appwiz.cpl` and uninstall Exchange.