// Flexible Filters with Isotope
// author: mocxd (//mocxd.github.io)
// requires JQuery (http://jquery.com/) and Isotope (http://isotope.metafizzy.co/) in prior load order
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
    var searchKey = 'filter';               // location.search key name to be used for url-based filtering


    // returns value of key param from location.search, or false
    var getSearch = function(param) {
        var q = location.search.substr(1),
            result = false;

        q.split('&').forEach(function(part) {
            var item = part.split('=');

            if (item[0] == param) {
                result = decodeURIComponent(item[1]);

                if (result.slice(-1) == '/') {
                    result = result.slice(0, -1);
                }
            }
        });
        return result;
    };

    // sets value for key param in location.search asynchronously, while preserving other keys if present
    var setSearch = function(param, value) {
        var q = location.search.substr(1),
            map = [],
            a = [],
            contains = false;

        if (q !== '') {
            q.split('&').forEach(function(part) {
                var k = (part.split('=')[0]),
                v = part.split('=')[1],
                o = {};

                if (part.split('=')[0] == param) {
                    v = encodeURIComponent(value);
                    contains = true;
                }

                o[k] = v;
                map.push(o);
            });
        }

        if (!contains) {
            var o = {};
            o[param] = encodeURIComponent(value);
            map.push(o);
        }

        map.forEach(function(v, i) {
            a[i] = Object.keys(v)[0] + '=' + v[Object.keys(v)[0]];
        });
        search = a.join('&');

        history.replaceState(
            { filtering : true },
            document.title + ' - filtering: ' + value,
            location.href.substr(0, location.href.indexOf('?') === -1 ? location.href.length : location.href.indexOf('?')) + '?' + search
            );
    };

    // filter on value f, or on * if no arguments are provided
    var filter = function(f = '*', grid = $grid) {
        // if f doesn't seem like a css selector
        // (i.e. it has no css selector syntax punctuation, and is a single word),
        // it will be converted to a simple class selector.  this is mainly to provide an easy way to do
        // something like data-filter="thing", since we usually don't care about filtering on element types
        if (!(/[*.~+>#=:()\[\]\s]/g.test(f))) {
            f = '.' + f;
        }

        grid.isotope({
            filter: f
        });
    }

    // update filter to value f in location.search, and then filter
    var updateFilter = function(f, skey = searchKey) {
        setSearch(skey, f);
        filter(f);
    };

    // filters on location.search (pre-filtered grids ignore)
    // this will also select the corresponding ui filter(s), if available
    var urlFilter = function(skey = searchKey, grid = $grid, options = jsOptions) {
        var f = getSearch(skey);
        if (!f || grid.hasClass(options.preFilter)) {
            return;
        }
        selectFilterUI(f);
        filter(f);
    }

    // pre-filters results if preFilter option is enabled in $grid
    // this will also select the corresponding ui filter(s), if available
    var preFilter = function(ui = $ui, grid = $grid, options = jsOptions) {
        var f = grid.attr(options.filterOn);
        if (!grid.hasClass(options.preFilter)) {
            return;
        }
        selectFilterUI(f);
        filter(f);
    }

    // binds filters to ui controls
    var bindUI = function(ui = $ui, grid = $grid, options = jsOptions) {
        ui.each(function(i) {
            var $this = $(this);
            var boundEvent = 'click'; // use this event by default

            // figure out what event to bind to
            if ($this.hasClass(options.click)) {
                boundEvent = 'click';
            } else if ($this.hasClass(options.change)) {
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

    // initialize isotope
    $grid.isotope(isotopeDefaults);

    // bind controls and execute any filtering needed at page load time
    // arguments default to config settings, but can be overridden for more complex page behavior
    bindUI();
    preFilter();
    urlFilter();

});