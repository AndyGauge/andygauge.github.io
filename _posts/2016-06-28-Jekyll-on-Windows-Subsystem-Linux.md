---
layout: post
section-type: post
title: Jekyll on Windows Subsystem for Linux
category: jekyll
tags: [ 'WSL' ]
---

In [Github Pages With Jekyll](/github-pages) I discussed my preference for running Linux tools on top of Windows, A Virtual Machine.  This isolation allows the Linux file system to be native to the kernel.  The Ext4 file system exists within a single file on the Host machine.

Microsoft Build 2016 rocked the world announcing Bash would be ported to Windows in the latest Windows Preview, a week later [Windows Blog](https://blogs.windows.com/windowsexperience/2016/04/06/announcing-windows-10-insider-preview-build-14316/) made the release announcement.  Another post by [Mike Harsh](https://blogs.windows.com/buildingapps/2016/03/30/run-bash-on-ubuntu-on-windows/) details the offering.  Just about every google search I do looking for details about using the subsystem fills the page with instructions how to install Windows Insider Preview.  [This one](http://www.howtogeek.com/249966/how-to-install-and-use-the-linux-bash-shell-on-windows-10/) had all the information I needed to get it running.

The Linux file system is stored within the `%LOCALAPPDATA%` in a hidden folder `lxss`.  Changes to the files from outside the bash environment does not appear on the Linux file system.  If you add a file to this folder, you will not see it within Bash.  Here is an issue, [#87](https://github.com/Microsoft/BashOnWindows/issues/87) that explains the cause and alternate resolution, as in this will never be fixed.

The `/mnt/c` folder is the Windows primary partition.  In order to integrate the bash environment with windows (such as using a Visual Text editor to modify files), don't use the home directory.  Create a folder on the root of the Windows partition and modify files there.  To help bridge the gap here, I create a folder `git` to hold my github repositories in `/mnt/c/` and execute `ln -s /mnt/c/git` from within my home directory.

RVM installs in bash using the same script on [rvm.io](https://rvm.io/), but in order to have the RVM shim available when opening the terminal, the shortcut needs to be modified.  Right click on the shortcut Bash on Ubuntu on Windows and open file location.  In this window right click the shortcut and open the properties.  Replace the Target with `C:\Windows\System32\bash.exe -c "/bin/bash --login"` to have bash execute login (`.bash_profile`) script.  By changing this shortcut, however, bash will open in the Start Menu (where the shortcut exists).  To fix this change the directory after RVM shims:

    echo "cd ~" >> ~/.bash_profile

The other big change is due to file system notification system.  NTFS does not trigger linux events that inotify can send to watch, or guard.  You cannot have the jekyll page reload after changes.  This was true with the setup through Virtualbox, as the changes to the shared folders did not trigger inotify events.  The difference here is running `jekyll serve` halts in an error.  To mitigate this problem, run with the `--no-watch` option.

This page was written on Bash on Ubuntu on Windows. 