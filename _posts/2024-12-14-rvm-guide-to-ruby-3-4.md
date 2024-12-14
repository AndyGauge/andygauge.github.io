---
layout: post
section-type: post
title: RVM guide to Ruby 3.4
category: ruby
tags: [ 'shiny' ]
---

The first step to installing ruby when you have rvm installed is to first implode.

```bash
rvm implode
```

Seriously.  Now is the time.  Why are you using rvm?  There's been a lot of struggles
with rvm and it's time to move on.  After reloading your shell remove the remnants
in ~/.bash_profile

Follow [asdf](https://asdf-vm.com/guide/getting-started.html) instructions, 
get node installed, then set up ruby.

```bash
brew install coreutils curl git
brew install asdf
brew install gpg gawk
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf install nodejs latest
asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install
asdf install ruby-3.4.0-rc1
```

Also set up the shims for ~/.bash_profile following asdf instructions.

```
. "$HOME/.asdf/asdf.sh"
```
