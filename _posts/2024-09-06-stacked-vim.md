---
layout: post
section-type: post
title: stacked vim
category: vim
tags: [ 'accessibility', 'fzf', 'ack' ]
---

Getting a 16 inch screen with more pixels than a 4k
TV has been a struggle to get used to.  One way I've
coped with the extra space is to set up vim in a stacked
view so I can have my editor next to my work.

This paper view is more familiar to my brain than the over
sized dark mode IDEs.  The trouble with vim is you have
to customize everything yourself and accessibility isn't
talked about much.

The amount of information an engineer needs to take in is
overwhelming and it can help to reduce the visual clutter
if you find yourself overwhelmed by the content.  I
switched to a 13 inch macbook and was used to not using
an external monitor.

Now, engineering gets a standard model (which is smart
from an IT management perspective 👏) but in order to
adjust to the extra space, I'm putting my code and work
side by side, which allows me to enforce an 80 column width by
setting my screen width to allow 80 characters wide when the vim-gitgutter
is tracking changes.

One struggle with fzf is the expectation for width not
height.  Using a preview window side by side full screen
in this window arrangement is impossible.  I couldn't find
any good examples of people setting up vim like a piece of
paper, ranging in the 1:1 through 1:2 ratio of columns to
rows.

With a simple configuration for the window will stack
the results with the preview taking up the majority of the view.

```
let g:fzf_preview_window = 'up:60%'
```

Before sharing the .vimrc that solves this, the best
resource for writing these turns out to be the [fzf.vim file](https://github.com/junegunn/fzf.vim/blob/c5ce7908ee86af7d4090d2007086444afb6ec1c9/plugin/fzf.vim).  Copying
the lines and extending them are the best way to write
custom versions.

```
command! -bang -nargs=* RgV
  \ call fzf#vim#grep('rg --column --no-heading --line-number --color=always '.shellescape(<q-args>),
  \ 1,
  \ fzf#vim#with_preview('up:60%'),
  \ <bang>0)
```

This command used by typing :RgV and pressing enter will
bring up the rip-grep preview taking up the top of the
window.  The custom command is bound to a keybinding for
search.

```
nnoremap <leader>s :RgV<Cr>
```

<img src="/img/rgv.png" />

## Ack

fzf is a great tool, but with another tool we can have the
output of rip-grep displayed in a separate split window
and by using inline preview after the file name and line
number, search results can be found quicker most of the
time.

```
function Search(string) abort
  let saved_shellpipe = &shellpipe
  let &shellpipe = '>'
  try
    execute 'Ack!' shellescape(a:string, 1)
  finally
    let &shellpipe = saved_shellpipe
  endtry
endfunction
```

This function will take the output of the results and using
[ack.vim](https://github.com/mileszs/ack.vim) customization
set the `g:ackprg`.  The shell pipe is used to output the
results into a clean buffer so that it doesn't bleed when
vi exits.

```
let g:ackprg = 'rg --vimgrep --smart-case --hidden'
```

<img src="/img/ackv.png" />

The entire search functionality for paged looking vim
terminals can be copied below.

```
" Search RipGrep preview fit for vertical window"
let g:fzf_layout = { 'tmux': '20%,80%' }

" Always show stacked vim"
let g:fzf_preview_window = 'up:60%'
nnoremap <leader>s :RgV<Cr>
nnoremap <leader>S :AgV <Cr>
nnoremap <leader>bb :Buffers<CR>
nnoremap <leader><leader> :FilesV<Cr>

" RipGrep vertical command"
command! -bang -nargs=* RgV
  \ call fzf#vim#grep('rg --column --no-heading --line-number --color=always '.shellescape(<q-args>),
  \ 1,
  \ fzf#vim#with_preview('up:60%'),
  \ <bang>0)

" Silver Search vertical preview"
command! -bang -nargs=* AgV
      \ call fzf#vim#ag(<q-args>,
      \ fzf#vim#with_preview('up:60%'),
      \ <bang>0)

" Ack tricks
function Search(string) abort
  let saved_shellpipe = &shellpipe
  let &shellpipe = '>'
  try
    execute 'Ack!' shellescape(a:string, 1)
  finally
    let &shellpipe = saved_shellpipe
  endtry
endfunction
let g:ackprg = 'rg --vimgrep --smart-case --hidden'
" Any empty ack search will search for the work the cursor is on
```

Please let me know what has made your vim experience better.
