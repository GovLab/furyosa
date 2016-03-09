// Flexible Filters with Isotope
// author: mocxd (//mocxd.github.io)
// requires JQuery (http://jquery.com/) and Isotope (http://isotope.metafizzy.co/) prior in load order
$(function() {
    // config options
    // see docs (//somewhere)
    var $grid = $('.b-isotope');            // jquery selector to bind the isotope grid to
    var $ui = $('.b-filter-ui');            // jquery selector to bind the ui element(s) to
    var jsOptions = {                       // names for template-configurable options. e.g. class="js-some-option"
        // for ui elements
        click           : 'js-click',       // binds filter behavior to click event
        change          : 'js-change',      // binds filter behavior to change event
        multiSelect     : 'js-multi',       // multiple select option, otherwise defaults to single select
        clearFilters    : 'js-clear',       // clears other filters when this filter is selected (multi select only)
        defaultFilter   : 'js-default',     // default filter to select on page load
        selectedClass   : 'm-active',       // [auto] class to toggle on ui control if selected (not added manually)
        // for grid element
        preFilter       : 'js-pre-filter',  // sets results to pre-filter on page load (ignores location.search)
        // for either
        filterOn        : 'data-filter'     // attribute name to be used for determining filter string(s)
    };
    var isotopeDefaults = {                 // default options for isotope. these can be overwritten with corresponding jsOptions
        itemSelector    : '.b-result',
        layoutMode      : 'fitRows',
        sortBy          : 'category'
    };
    var searchKey   = 'filter';             // location.search key name to be used for url-based filtering

    // binds filters to ui controls
    var bindUI = function(ui = $ui, grid = $grid, options = jsOptions) {
        ui.each(function(i) {
            var $this = $(this);
            var boundEvent = 'click'; // use this event by default

            // figure out what event to bind to
            if ( $this.hasClass(options.click) ) {
                boundEvent = 'click';
            } else if ( $this.hasClass(options.change) ) {
                boundEvent = 'change';
            }

            // set up handler for that event
            $this.on(boundEvent, function() {
                var filterValue;

                filterValue = $this.attr(options.filterOn);

                // update the filter (which also updates the current location.search string for permalinking)
                updateFilter(filterValue);
            });
        });
    };

    // single filter term
    var singleSelectFilter = function() {
        $('.b-filter-ui select').on('change', function() {
            var filterValue = this.value;
            updateHash(filterValue);
        });
    };

    var setSingleFilter = function(val) {
        $('.b-filter-ui select').val(val);
    };

    // multiple filter terms
    var multipleSelectFilter = function() {
        // Functionality for filter UI buttons
        $('.b-filter-ui').on('click', 'button', function() {

            var filterValue = '';

            // Clicking 'All' filter
            if ($(this).hasClass('m-clear-filters')) {

                // Deselect all others
                $('.b-filter-ui').children().each(function() {
                    $(this).removeClass('m-selected');
                });

                // Can only select, not deselect 'All'
                $(this).addClass('m-selected');

                filterValue = '*';

                // Clicking any other filter
            } else {

                $('.b-filter-ui .m-clear-filters').removeClass('m-selected');

                // Swap selection state of button
                if (!$(this).hasClass('m-selected')) {
                    $(this).addClass('m-selected');
                } else {
                    $(this).removeClass('m-selected');
                }

                // Build filter string from all selected filters
                $('.b-filter-ui').children().each(function() {
                    if ($(this).hasClass('m-selected')) {
                        filterValue += $(this).attr('data-filter');
                    }
                });

            }

            selectDefaultFilter();
            updateHash(filterValue);
        });
    };

    // Used for multipleSelect() only
    // If nothing is selected, select 'All' filter
    var selectDefaultFilter = function() {
        var noneSelected = true;

        $('.b-filter-ui').children().each(function() {
            if ($(this).hasClass('m-selected')) {
                noneSelected = false;
            }
        });

        if (noneSelected) {
            $('.b-filter-ui .m-clear-filters').addClass('m-selected');
        }
    };

    // update the url hash to a single value
    var updateHash = function(val) {
        // replace current history state and trigger a custom event so we don't create history items on change
        history.replaceState(undefined, undefined, '#' + val.replace('.', ''));
        $(window).trigger('hashreplace');
    };

    var filterOnHash = function() {
        var filterValue = document.location.hash.replace('#', '');
        if (filterValue !== '*') {
            filterValue = '.' + filterValue;
        }
        $grid.isotope({
            filter: filterValue
        });
    };

    // uncomment to switch to multiple select
    //multipleSelectFilter();
    //selectDefaultFilter();

    // uncomment to switch to single select
    singleSelectFilter();

    // watch for hash changes
    $(window).on('hashreplace', function() {
        filterOnHash();
    });

    // 1st time page is visited update filter from hash
    if (document.location.hash) {
        // set the value of the select control
        var filterValue = document.location.hash.replace('#', '');
        if (filterValue !== '*') {
            filterValue = '.' + filterValue;
        }
        setSingleFilter(filterValue);
        // then filter on it, because setting it via .val() is this way doesn't pop a change event
        filterOnHash();
        // or use * if no hash in url
    } else {
        $grid.isotope({
            filter: '*'
        });
    }

    var query = function (param) {
        var query = location.search.substr(1),
            result = false;

        query.split('&').forEach(function(part) {
            var item = part.split('=');

            if (item[0] == param) {
                result = decodeURIComponent(item[1]);

                if (result.slice(-1) == '/') {
                    result = result.slice(0, -1);
                }
            }
        });

        return result;
    }

    // initialize isotope
    $grid.isotope(isotopeDefaults);

    // bind controls and execute any filtering needed at page load time
    // arguments default to config settings, but can be overridden for more complex page behavior
    bindUI();
    preFilter();
    urlFilter();

    // pre-filters results if preFilter option is enabled in $grid
    // this will also select the corresponding ui filter(s), if available

    // filters on location.search (pre-filtered grids ignore)
    // this will also select the corresponding ui filter(s), if available
});