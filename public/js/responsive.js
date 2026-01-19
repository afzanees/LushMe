/**
 * Mobile Navigation and Responsive Functionality
 * Handles mobile menu toggles, filter panels, and responsive behaviors
 */

(function() {
  'use strict';

  // ========================================
  // ADMIN SIDEBAR TOGGLE
  // ========================================
  function initAdminSidebar() {
    const sidebar = document.querySelector('.navbar-aside');
    const mainWrap = document.querySelector('.main-wrap');
    const header = document.querySelector('.main-header');
    
    if (!sidebar) return;

    // Create mobile menu toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-menu-toggle';
    toggleBtn.innerHTML = '<i class="fa fa-bars"></i>';
    toggleBtn.setAttribute('aria-label', 'Toggle menu');
    
    // Insert toggle button in header
    if (header) {
      header.insertBefore(toggleBtn, header.firstChild);
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Toggle sidebar
    function toggleSidebar() {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
      document.body.style.overflow = sidebar.classList.contains('show') ? 'hidden' : '';
    }

    // Event listeners
    toggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && sidebar.classList.contains('show')) {
        toggleSidebar();
      }
    });

    // Close sidebar when clicking a menu link on mobile
    const menuLinks = sidebar.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (window.innerWidth < 993) {
          setTimeout(toggleSidebar, 300);
        }
      });
    });
  }

  // ========================================
  // USER SITE MOBILE NAVIGATION
  // ========================================
  function initMobileNav() {
    const nav = document.querySelector('header .nav');
    if (!nav || window.innerWidth > 768) return;

    // Create hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'mobile-nav-toggle';
    hamburger.innerHTML = '<i class="fa fa-bars"></i>';
    hamburger.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      z-index: 1000;
    `;

    const header = document.querySelector('header');
    if (header) {
      header.style.position = 'relative';
      header.appendChild(hamburger);
    }

    // Toggle navigation
    nav.style.display = 'none';
    let isNavOpen = false;

    hamburger.addEventListener('click', function() {
      isNavOpen = !isNavOpen;
      nav.style.display = isNavOpen ? 'flex' : 'none';
      hamburger.innerHTML = isNavOpen ? '<i class="fa fa-times"></i>' : '<i class="fa fa-bars"></i>';
    });
  }

  // ========================================
  // SHOP FILTER TOGGLE
  // ========================================
  function initFilterToggle() {
    const filterSidebar = document.querySelector('.col-md-3');
    if (!filterSidebar || window.innerWidth > 992) return;

    // Wrap filters
    const filtersWrapper = document.createElement('div');
    filtersWrapper.className = 'filters-wrapper';
    filterSidebar.parentNode.insertBefore(filtersWrapper, filterSidebar);
    filtersWrapper.appendChild(filterSidebar);

    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'filter-toggle';
    toggleBtn.innerHTML = '<i class="fa fa-filter"></i> Filter Products';
    filtersWrapper.parentNode.insertBefore(toggleBtn, filtersWrapper);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'filter-overlay';
    document.body.appendChild(overlay);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fa fa-times"></i> Close';
    closeBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #333;
      color: #fff;
      border: none;
      margin-bottom: 20px;
      cursor: pointer;
    `;
    filtersWrapper.insertBefore(closeBtn, filtersWrapper.firstChild);

    // Toggle filters
    function toggleFilters() {
      filtersWrapper.classList.toggle('show');
      overlay.classList.toggle('show');
      document.body.style.overflow = filtersWrapper.classList.contains('show') ? 'hidden' : '';
    }

    toggleBtn.addEventListener('click', toggleFilters);
    closeBtn.addEventListener('click', toggleFilters);
    overlay.addEventListener('click', toggleFilters);
  }

  // ========================================
  // RESPONSIVE TABLES
  // ========================================
  function makeTablesResponsive() {
    const tables = document.querySelectorAll('table:not(.table-responsive table)');
    tables.forEach(table => {
      if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  }

  // ========================================
  // CARD GRID ADJUSTMENTS
  // ========================================
  function adjustCardGrids() {
    const cardRows = document.querySelectorAll('.row-cols-1, .row-cols-md-2, .row-cols-lg-4');
    cardRows.forEach(row => {
      if (window.innerWidth < 768) {
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
      } else {
        row.style.display = '';
        row.style.flexDirection = '';
      }
    });
  }

  // ========================================
  // TOUCH DEVICE DETECTION
  // ========================================
  function detectTouchDevice() {
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
      document.body.classList.add('touch-device');
      
      // Remove hover effects on touch devices
      const style = document.createElement('style');
      style.textContent = `
        .touch-device *:hover {
          /* Disable problematic hover effects on touch devices */
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ========================================
  // IMAGE LAZY LOADING
  // ========================================
  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const images = document.querySelectorAll('img[data-src]');
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  // ========================================
  // VIEWPORT HEIGHT FIX FOR MOBILE
  // ========================================
  function setVHProperty() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // ========================================
  // PREVENT ZOOM ON INPUT FOCUS (iOS)
  // ========================================
  function preventIOSZoom() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.style.fontSize && parseFloat(input.style.fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });
  }

  // ========================================
  // INITIALIZE ON LOAD
  // ========================================
  function init() {
    initAdminSidebar();
    initMobileNav();
    initFilterToggle();
    makeTablesResponsive();
    adjustCardGrids();
    detectTouchDevice();
    initLazyLoading();
    setVHProperty();
    preventIOSZoom();
  }

  // ========================================
  // HANDLE WINDOW RESIZE
  // ========================================
  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      adjustCardGrids();
      setVHProperty();
      
      // Remove mobile elements if resized to desktop
      if (window.innerWidth > 992) {
        document.querySelectorAll('.sidebar-overlay, .filter-overlay').forEach(el => {
          el.classList.remove('show');
        });
        document.body.style.overflow = '';
      }
    }, 250);
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(setVHProperty, 100);
  });

  // ========================================
  // EXPORT FOR GLOBAL USE
  // ========================================
  window.ResponsiveHelper = {
    initAdminSidebar,
    initMobileNav,
    initFilterToggle,
    makeTablesResponsive,
    adjustCardGrids
  };

})();
