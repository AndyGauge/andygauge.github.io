---
layout: post
section-type: post
title: 'Github Pages with Jekyll'
category: presentation
permalink: /github-pages
tags: [ 'jekyll', 'github' ]
---

Before beginning the talk on Github Pages with Jekyll, we need to talk about Ruby on Windows.
One option is to install ruby and the dev kit locally, and run the gem commands.  There's only 7 steps to do this, and they are fairly straightforward.  [Jekyll on Windows](http://jekyll-windows.juthilo.com/1-ruby-and-devkit/) provides a good resource on how to run in this unsupported mode.

For me, I find Windows to be a poor platform for non-Microsoft languages.  I have a VM that runs Ubuntu, where I compile build tools and interpret ruby code.
I make this recommendation because all of the advice, help, and support are for nix environments.  A little extra effort ahead of time will pay dividends when you get stuck later.
[VirtualBox](https://www.virtualbox.org/wiki/Downloads) is an Oracle product that does a good job of bringing Virtualization to the common man.

Creating a VM
-------------

Installing Virtualbox is just a matter of clicking a bunch of next buttons.  Setting up a VM, however, takes instruction.  We are going to configure a terminal version of Ubuntu where we will issue commands to configure our development environment.  We will connect this VM to our host computer so we can write files using our favorite (tm) text editor.  Additionally we will connect this computer to our account on github so we can publish our site.

1. Click the New button
2. Type in Ruby, notice the type of VM changes to Ubuntu 64 bit.  Apparently, Oracle thinks ruby runs best on linux too.  If the version does not include 64-bit your processor does not have the virtualization options enabled in BIOS.  Almost all computers ship with these options disabled.  Go into BIOS and find the Intel VT or AMD-V option and enable it.
3. Leave the defaults for memory, and create a storage device by clicking OK.  What happens with storage on VMs is a single file on the physical disk stores the entire file system.  Later we will interact with that file system using our host machine.
4. Create a file system, it is OK to oversize the file system, because it will allocate the storage over time, rather than just blocking out the size of the storage immediately.  The difference between choosing 8GB and 800GB at this time is what happens when the guest hits the 8GB mark.  You will need to shutdown the guest and resize the disk offline if you leave the 8GB default.  It doesn't matter if you actually have 800 GB of storage or not.  Dynamically allocated is the default option.
5. If you look at the settings, the VM has only 1 CPU, so if you have multiple cores and are doing a lot of computationally intensive tasks (like compiling your build tool binaries), increase the number of virtual procesors.  One virtual processor equates to a single core.  VM processors do not have multiple virtual cores.
6. In network, you will see a single network adapter that is configured for NAT.  This allows your host network IP address to act as a router for your VM(s).  Network Address Translation keeps track of the TCP sessions and redirects packets appropriately.  The major drawback with this configuration is making requests from the host to the guest.  I prefer to have a host only network adapter in addition to the NAT network.  To do this, click Adapter 2 tab and enable the network adapter.  The connect to drop down should be changed to host-only network.  This will be the 192.168.56 network, with the host having the ip address of 192.168.56.1
7. In the storage configuration, the virtual CD ROM drive is for mounting an ISO of your favorite distribution.  I chose Ubuntu because of the quality of the support content on the internet.  Ubuntu releases a LTS long term support every 2 years, and 3 additional releases in between.  16.04 is the most recent LTS version.  Make sure you download the 64-bit version.  
8. Save configuration options and power on your VM.  The installlation process is painless, so we won't cover it here.

Configuring VM
--------------

Add the second network interface using text editor.  Add to the /etc/network/interfaces file:

    auto eth1
    iface eth1 inet static
    address 192.168.56.2
    netmask 255.255.255.0
    network 192.168.56.0

Install RVM:
 
    gpg --keyserver hkp://keys.gnupg.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3
    \curl -sSL https://get.rvm.io | bash -s stable


Connecting Host and Guest
-------------------------

Install virtualbox guest additions:

    sudo apt-get install virtualbox-guest-utils

Add user to /etc/group file to vboxsf 

    . . . 
    vboxsf:x:116:andy
    . . . 

On the Host computer, click on the Device menu, expand the Shared Folders menu, click on Shared Folder Settings...  A dialog appears for configuring a file system link between the host and guest.  We will use this location to stage files on their way to being published.  Click on the folder with a plus sign to add a shared folder.  In the dialog box, Folder Path is the location on the Host computer (windows).  If you select other from the drop down, a file location picker dialog appears.  A new folder under libraries\documents\my documents seems to be the most compatible with other software.  Spaces are a pain in terminal-based file systems, replace spaces with dashes (-).  The Folder Name is used in the Virtualbox dialogs and on the guest file system.  Select Make Permenant and Auto-mount.  I will be using jekyll-test as my folder name.

    sudo su
    mkdir /media/sf_jekyll-test
    mount -t vboxsf jekyll-test /media/sf_jekyll-test
    exit

Either execute these command or reboot to aquire the auto-mount

Git Configuration
-----------------

    sudo apt-get install git
    git config --global user.name "Andrew Gauger"
    git config --global user.email "andy@yetanother.site"
    ssh-keygen -t rsa -b 4096 -C "andy@yetanother.site"
    ssh-add ~/.ssh/id_rsa
    cp ~/.ssh/id_rsa /media/sf_jekyll-test

Open a browser and log into github account, [SSH Settings](https://github.com/settings/ssh).  Create a new SSH key and paste the contents of id_rsa from the mounted folder.  Delete the file once Github is configured.  Certificates are a big deal, you want to keep them secure.  While you are on your github page, create a new repository using the convention `username.github.io` as the repository name.  On this special repository, in the master branch, github pages will automatically generate.  My username is AndyGauge, so the following works for me:

    cd /media/sf_jekyll-test
    rm *
    git init
    git remote add origin git@github.com:AndyGauge/andygauge.github.io.git

On To Jekyll
------------

[Jekyll](http://jekyllrb.com) recommends installing Jekyll using `gem install jekyll` which is pretty easy installation, but because we are using Jekyll to build Github pages, there's another way.  

    gem install github-pages 

 This will install jekyll for you, using the appropriate version that Github Pages currently uses.  This will keep your local environment in sync with your production environment.  Since Github Pages recently switched to Jekyll 3, this shouldn't be a problem in the near future.  (Note to future readers:  Now that this has been proven wrong, aren't you glad you used github-pages?)

Github-pages gem also provides a tool for checking the DNS configuration of your site:

    github-pages health-check

If you are using username.github.io this tool returns an error.  Everything is working fine if the response is Error: No CNAME file.  This tool is for custom domains.

Configuring your directory to be a jekyll site is simple using the jekyll binary.  The folder here is 'empty' so jekyll can build the site here.  

    cd /media
    jekyll new sf_jekyll-test
    cd sf_jekyll-test
    jekyll serve --host 192.168.56.2

From the host machine, browsing to 192.168.56.2:4000 demonstrates the Jekyll Skeleton

This file is named with a date, in YYYY-MM-DD, followed by the dashed title.  This is a Markdown file, following stackoverflow, github comments, etc. styling.  At the top of the file is two rows with three dashes with YAML embedded between them.  Adding this file to the _posts directory and rebuilding the site changes the index page, and adds a post to the blog.  The URL of the post has category, the date in a folder structure, and the title rendered with html.

What you do not see is a database, or server side content.  Jekyll is a static site generator, using configuration files.  Content is saved as plain text, using YAML to store properties.  The category of this file, for example, is embedded in the page between the dashes in the page's [Front Matter](https://jekyllrb.com/docs/frontmatter/).  The dashes are responsible for holding metadata and informing Jekyll to compile the page.

Jekyll Folders & Jekyll Files
-----------------------------

|folder   | use                             |
|---------|---------------------------------|
|_posts   |blog entries                     |
|_layouts |templates applied to static pages|
|_includes|files referenced in layouts      |
|_site    |generated site                   |  
  
Also, the _config.yml in the root directory has a special purpose.  It becomes pretty apparent that most of the page is generic, and those configuration options exist in this file.  These attributes get embedded within layout or include files using [Liquid templating Engine](https://jekyllrb.com/docs/templates/)

Liquid uses a few control structures that are beyond the scope of this introduction, but they exist between `{{ "{% " }} %}` tags.  To render attributes from the _config.yml file, `{{ "{{ site.VAR " }}}}` format can be used.

By default Jekyll uses [kramdown](http://kramdown.gettalong.org/) for mardown processing which includes a few additions to Daring Fireball's Markdown syntax.  One thing is the ASCII table above.  Another change is named Headers. 

Themes
------

[Jekyll Themes](http://jekyllthemes.org/) offers hundreds of free to use jump start designs.  Simply fork the repository and rename yours accordingly.  [Jekyll Now](https://github.com/barryclark/jekyll-now) includes a video to demonstrate how easy it is to get the blog started.

Publishing
----------

As long as the changes to the repository have been commited to master branch

    git push origin master

Browse to username.github.io and enjoy! 