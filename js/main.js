// Main JavaScript for the site

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            const isExpanded = !mobileMenu.classList.contains('hidden');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded);
        });
    }
    
    // Close mobile menu when clicking on a link
    const mobileMenuLinks = document.querySelectorAll('.mobile-menu a');
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.add('hidden');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
        });
    });
    
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offsetTop = target.offsetTop - 80; // Account for fixed header
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Typed.js initialization for dynamic typing
    if (typeof Typed !== 'undefined' && document.getElementById('typed-text')) {
        const typedTextElement = document.getElementById('typed-text');
        const lines = [
            "module ApplicationHelper",
            "  def pb_menu_item (controller_name, path: nil, display: controller_name.capitalize)",
            "    path ||= send('#{controller_name.downcase}_path')",
            "    'li class='nav-item #{' active' if current_page?(path)}'",
            "      a class='nav-link pb-navbar-link'href='#{path}'#{display}/a",
            "    /li'.html_safe",
            "  end",
            "  def pb_bottom_menu(items)",
            "    items.inject('') {|collects, item|",
            "      collects + 'li class='nav-item'>' + link_to(item.titleize, send('#{item}_path'), class: 'nav-link') + '/li'",
            "    }.html_safe",
            "  end",
            "end"
        ];
        
        new Typed('#typed-text', {
            strings: lines,
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2000,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        });
    }
    
    // Add scroll effect to navigation
    const nav = document.querySelector('nav');
    if (nav) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                nav.classList.add('shadow-github-lg');
            } else {
                nav.classList.remove('shadow-github-lg');
            }
        });
    }
    
    // Add fade-in animation to elements as they come into view
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);
    
    // Observe all cards and sections
    const elementsToAnimate = document.querySelectorAll('.card, .construction-photo, .stat-card');
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
});
