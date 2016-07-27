var Grid = (function(){
    'use strict';

    var RAF = window.requestAnimationFrame;

    var throttle = (function(){
        var wait = false;
        return function(callback, limit){
            if( !wait ){
                callback();
                wait = true;
                setTimeout(function(){
                    wait = false;
                }, limit);
            }
        }
    })();

    function Grid(settings){
        var that = this;
        this.settings = $.extend({}, this.defaults, settings);

        // calculate a grid's item width & height in percentages
        //this.settings.rows      = Math.ceil(this.settings.size / this.settings.columns);
        this.settings.gridItemW = 100 / this.settings.columns,
        this.settings.gridItemH = 100 / this.settings.rows;

        this.DOM = {};
    }

    Grid.prototype = {
        defaults : {
            rows                : 6,
            columns             : 12,
            gap                 : 6, // in px
            areaConstraints     : {
                minimum : [[1,1]],
                maximum : 10
            },
            areaTemplate : `<div class="grid__area grid__area--empty">
                                <b class='resize resize--top'></b>
                                <b class='resize resize--right'></b>
                                <b class='resize resize--bottom'></b>
                                <b class='resize resize--left'></b>
                                <b class='grid__area__reposition'></b>
                                <button class='grid__area__removeBtn'>&times;</button>
                            </div>`
        },

        init(){
            this.DOM.scope = $( this.generate() );
            this.DOM.items = this.DOM.scope.find('.grid__item');

            this.events.binding.call(this);
            return this;
        },

        generate(){
            var item = `<div class="grid__line"></div>`,
                grid = `<div class='grid'>
                            <div class='grid__h-lines'>${Array(this.settings.rows + 2).join(item)}</div>
                            <div class='grid__v-lines'>${Array(this.settings.columns + 2).join(item)}</div>
                        </div>`;

            return grid;
        },

        getCellCordsByIdx(absIdx){
            // return [(absIdx/this.settings.columns)|0, absIdx % this.settings.columns]; // [column, row]
            return [absIdx % this.settings.columns, (absIdx/this.settings.columns)|0]; // [row, column]
        },

        clearAllSelected(){
            this.DOM.items.filter('.selected').removeClass('selected overlap');
        },

        selectCells(cells){
            this.clearAllSelected();

            var regionOverlap = cells.filter('.defined').length > 0, // check all the cells if any are already "defined" (meanning they belong to an Area)
                selectedClass = regionOverlap ? 'selected overlap' : 'selected';

            // clear all previously selected cells

            cells.addClass(selectedClass);

            return !regionOverlap; // no overlap meanning it's a valid region selection
        },

        getAreaRange(startIdx, endIdx){
            return {
                cols : [startIdx[0], endIdx[0]].sort((a,b)=> a-b ), // left most columns index, right most columns index
                rows : [startIdx[1], endIdx[1]].sort((a,b)=> a-b ) // top most row index, bottom most row index
            }
        },

        /**
         * @param  {Array} areaData - {rows:[MIN, MAX], cols[MIN, MAX]}
         */
        getAreaCssPosition(areaData){
            return {
                top    : 'calc(' + areaData.rows[0] * this.settings.gridItemH + '%)',
                left   : 'calc(' + areaData.cols[0] * this.settings.gridItemW + '%)',
                height : 'calc(' + (areaData.rows[1] - areaData.rows[0] + 1) * this.settings.gridItemH + '% - '+ this.settings.gap * 2 + 'px)',
                width  : 'calc(' + (areaData.cols[1] - areaData.cols[0] + 1) * this.settings.gridItemW + '% - '+ this.settings.gap * 2 + 'px)'
            }
        },

        /**
         * @param  {Array} areaData - {rows:[MIN, MAX], cols[MIN, MAX]}
         */
        setAreaProperties(areaElm, areaData){
            // position the template element
            areaElm.css( this.getAreaCssPosition(areaData) ).data({ 'area': areaData });

            return this;
        },

        /**
         * @param  {Array} areaData      - {rows:[MIN, MAX], cols[MIN, MAX]}
         * @param  {DOM Object} areaElm  - optional - a predefined elmement that will rendered inside the template
         */
        renderArea(areaData, areaElm){
            var tmpl = this.settings.areaTemplate;
            areaElm = areaElm || '';

            if( areaElm )
                tmpl.replace('grid__area--empty', ''); // remove the "empty" modifier

            areaElm = $(this.settings.areaTemplate).append(areaElm);

            if( areaData )
                this.setAreaProperties(areaElm, areaData);

            return areaElm;
        },

        removeArea(areaElm){
            areaElm.addClass('removed');
            setTimeout(() => { areaElm.remove() }, 500)
        },

        // detects an overlap of a givven area with others
        detectOverlap(getMatches){
            var gap = this.settings.gap/2,
                areas = this.DOM.scope.find('> .grid__area:not(.grid__area--dragged)').map(function(idx){
                    var rect = this.getBoundingClientRect();
                    return {
                        idx : idx,
                        elm : this,
                        x   : [rect.left - gap, rect.left + rect.width + gap],
                        y   : [rect.top - gap, rect.top + rect.height + gap]
                    };
                }),
                matches = [],
                i, j;

            // check one area against all others
            for( i=0; i < areas.length; i++ )
                for( j=0; j < areas.length; j++ ){
                    if( areas[i] !== areas[j] &&                                            // avoid checking the same area
                        areas[i].x[0] < areas[j].x[1] && areas[j].x[0] < areas[i].x[1] &&   // check X
                        areas[i].y[0] < areas[j].y[1] && areas[j].y[0] < areas[i].y[1] ){   // check Y
                        if( getMatches )
                            matches[areas[i].idx] = areas[i].elm;
                        else
                            return [areas[i].elm];
                    }
                }

            return matches;
        },


        /**
         * Given [x,y] coordinate on the grid, returns the cell (grid item) there
         * @param  {Array}   cords      [x, y] point in the whole grid
         * @param  {Array}   gridOffset {top:[value], left:[value]}
         */
        getGridPosByCords(cords, gridOffset){
            var xPos        = cords.x - gridOffset.left,
                xPercentage = xPos / this.DOM.scope[0].clientWidth * 100,
                col         = Math.floor(xPercentage / this.settings.gridItemW),

                yPos        = cords.y - gridOffset.top,
                yPercentage = yPos / this.DOM.scope[0].clientHeight * 100,
                row         = Math.floor(yPercentage / this.settings.gridItemH);

            // fix overflows
            row = Math.min(row, this.settings.rows - 1);
            col = Math.min(col, this.settings.columns - 1);

            // fix negatives that might happen
            row = row < 0 ? 0 : row;
            col = col < 0 ? 0 : col;

            return [col, row];
        },

        getItemSizeInPx(){
            var someItem = this.DOM.scope.find('.grid__item');

            return {
                width  : someItem.width(),
                height : someItem.height()
            }
        },

        events : {
            binding(){
                this.DOM.scope.on('mousedown.gridItem', this.events.callbacks.onGridItemMouseDown.bind(this) )
                              .on('grid.selected', this.events.callbacks.onSelectedGrid.bind(this))
                              .on('mousedown', '.resize', this.events.callbacks.onAreaResizeMouseDown.bind(this) )
                              .on('mousedown', '.grid__area__reposition', this.events.callbacks.onAreaRepositionMouseDown.bind(this) )
                              .on('click.removeArea', '.grid__area__removeBtn', this.events.callbacks.onRemoveAreaBtnClick.bind(this) )
                },
            callbacks : {
                ////////////////////////////
                // Defining an Area
                onGridItemMouseDown(e){
                    // allow only left mouse click & only on the grid itself (not children)
                    if( e.which != 1 || !e.target.classList.contains('grid') )
                        return;

                    var that          = this,
                        offset        = this.DOM.scope.offset(),
                        startPos      = this.getGridPosByCords( {x:e.clientX, y:e.clientY} , offset),
                        areaRange     = this.getAreaRange(startPos, startPos),
                        selectionArea = this.renderArea(areaRange).addClass('grid__area--selection');


                    // append newly created area to the DOM
                    this.DOM.scope.append( selectionArea );

                    // if overlap occurs, remove the selectionArea completely
                    if( this.detectOverlap().length ){
                        selectionArea.remove();
                        return;
                    }

                    // bind "mouse move" event
                    this.DOM.scope.on('mousemove', onGridMouseMove);
                    $(document).on('mouseup.grid', onGridItemMouseUp.bind(this) )

                    // on mouse-up callbacl
                    function onGridItemMouseUp(e){
                        var overlap = selectionArea.hasClass('grid__area--invalid');

                        window.getSelection().removeAllRanges(); // fix any text selection (by "releasing" it) that might have ocur on the document

                        // clear events
                        $(document).off('mouseup.grid');
                        this.DOM.scope.off('mousemove');

                        if( overlap )
                            this.removeArea(selectionArea);
                        else
                            selectionArea.removeClass('grid__area--selection');
                    }

                    // on mouse-move callbacl
                    function onGridMouseMove(e){
                        RAF(function(){
                            var endCellIdx = that.getGridPosByCords( {x:e.clientX, y:e.clientY} , offset);

                            areaRange = that.getAreaRange(startPos, endCellIdx);
                            //   validSelection = this.selectCells(selectionCells.cells); // try to select the cells (if not overlapping occured)

                            // detect *any* overlap that might exist and set a class if so
                            selectionArea.toggleClass('grid__area--invalid', !!that.detectOverlap().length);

                            that.setAreaProperties(selectionArea, areaRange);
                        })
                    }
                },

                ////////////////////////////
                // Resizing
                onAreaResizeMouseDown(mouseDownEvent){
                    if (mouseDownEvent.which != 1) return;

                    var that       = this,
                        resizeElm  = $(mouseDownEvent.target),                       // the side-corner that was clicked on

                        areaItem   = resizeElm.closest('.grid__area'),  // area item
                        dir        = mouseDownEvent.target.className.split('--')[1], // direction where dragging it allowed

                        boxArea    =  areaItem.data('area'),                  // get current area position
                        newBoxArea = $.extend(true, {}, boxArea),             // new box area starts as the currently defined area position
                        lastValidRange,
                        mouseup    = false,  // flag on mouse up

                        minPosition = this.getAreaCssPosition({ cols:[0,0], rows:[0,0] }),
                        offset      = this.DOM.scope.offset();           // grid offset cords

                    areaItem.addClass('grid__area--resized');
                    resizeElm.addClass('active');
                    this.DOM.scope.on('mousemove.resize', onResizeMouseMove );

                    // on mouse-up
                    $(document).on('mouseup.grid', function(){
                        mouseup = true;
                        window.getSelection().removeAllRanges(); // clear any window text selection
                        resizeElm.removeClass('active');
                        $(document).off('mouseup.grid');
                        that.DOM.scope.off('mousemove.resize');

                        var overlap = !!that.detectOverlap().length;

                        if( lastValidRange )
                            that.setAreaProperties(areaItem, lastValidRange);

                        areaItem.removeClass('grid__area--invalid grid__area--resized');
                    });

                    // on mouse-move
                    function onResizeMouseMove(e){
                        RAF(function(){
                            if( mouseup ) return;

                            var pos = that.getGridPosByCords({ x:e.clientX, y:e.clientY }, offset),
                                overlap,
                                tempPos,
                                areaRange;

                            // check constraints before updating positions
                            if( dir == 'top' && pos[1] <= boxArea.rows[1] ){ // as long as Y position is lower or equal the original END Y position of the area
                                newBoxArea.rows[0] = pos[1];
                                if( newBoxArea.rows[1] == newBoxArea.rows[0] ){
                                    areaItem[0].style.top  = 'calc(' + newBoxArea.rows[0] * that.settings.gridItemH + '% + '+ that.settings.gap + 'px)';
                                    areaItem[0].style.height = minPosition.height;
                                }
                                else{
                                    areaItem[0].style.top    = e.clientY - offset.top - mouseDownEvent.offsetY - 2 + 'px';
                                    areaItem[0].style.height = 'calc(' + (boxArea.rows[1] - boxArea.rows[0] + 1 ) * that.settings.gridItemH + '% + '+ (mouseDownEvent.clientY - e.clientY - that.settings.gap*3) + 'px)';
                                }
                            }

                            if( dir == 'bottom' && pos[1] >= boxArea.rows[0] ){ // as long as Y position is higher or equal the original START Y position of the area
                                newBoxArea.rows[1] = pos[1];
                                if( newBoxArea.rows[1] == newBoxArea.rows[0] )
                                    areaItem[0].style.height = minPosition.height;
                                else
                                    areaItem[0].style.height = 'calc(' + (boxArea.rows[1] - boxArea.rows[0] + 1 ) * that.settings.gridItemH + '% + '+ (e.clientY - mouseDownEvent.clientY - that.settings.gap*2) + 'px)';
                            }

                            if( dir == 'left' && pos[0] <= boxArea.cols[1] ){ // as long as X position is lower or equal the original END  X position of the area
                                newBoxArea.cols[0] = pos[0];
                                if( newBoxArea.cols[1] == newBoxArea.cols[0] ){
                                    areaItem[0].style.left  = 'calc(' + newBoxArea.cols[0] * that.settings.gridItemW + '% + '+ that.settings.gap + 'px)';
                                    areaItem[0].style.width = minPosition.width;
                                }
                                else{
                                    areaItem[0].style.left  = e.clientX - offset.left - mouseDownEvent.offsetX - 2 + 'px';
                                    areaItem[0].style.width = 'calc(' + (boxArea.cols[1] - boxArea.cols[0] + 1 ) * that.settings.gridItemW + '% + '+ (mouseDownEvent.clientX - e.clientX - that.settings.gap*3 ) + 'px)';
                                }
                            }
                            if( dir == 'right' && pos[0] >= boxArea.cols[0] ){ // as long as X position is higher or equal the original START X position of the area
                                newBoxArea.cols[1] = pos[0];
                                if( newBoxArea.cols[1] == newBoxArea.cols[0] )
                                    areaItem[0].style.width = minPosition.width;
                                else
                                    areaItem[0].style.width = 'calc(' + (boxArea.cols[1] - boxArea.cols[0] + 1 ) * that.settings.gridItemW + '% + '+ (e.clientX - mouseDownEvent.clientX - that.settings.gap*2) + 'px)';
                            }

                            // that.setAreaProperties(areaItem, areaRange);

                            throttle(function(){
                                if( mouseup ) return;
                                overlap = !!that.detectOverlap().length;
                                areaItem.toggleClass('grid__area--invalid', overlap);

                                if( !overlap ){
                                    lastValidRange = that.getAreaRange([ newBoxArea.cols[0], newBoxArea.rows[0]], [newBoxArea.cols[1], newBoxArea.rows[1] ]);
                                }
                            }, 80);
                        })
                    }
                },

                ////////////////////////////
                // Re-positioning (via drag)
                onAreaRepositionMouseDown(mouseDownEvent){
                    if (mouseDownEvent.which != 1) return;

                    var that          = this,
                        offset        = this.DOM.scope.offset(),

                        areaItem      = $(mouseDownEvent.target).closest('.grid__area'),
                        areaItemClone = $('<div class="grid__area grid__area--dummy">').attr('style', areaItem.attr('style')), // create a clone of the area with the same style (position)

                        boxArea       = areaItem.data('area'),
                        newBoxArea    = {cols:1, rows:1},
                        lastAreaCords = [ boxArea.cols[0], boxArea.rows[0]],
                        destPos,
                        areaSize     = {
                            x : boxArea.cols[1] - boxArea.cols[0] + 1,
                            y : boxArea.rows[1] - boxArea.rows[0] + 1
                        },
                        mouseup = false;


                    areaItem.addClass('grid__area--dragged');
                    that.DOM.scope.addClass('dragging')
                    that.DOM.scope.append(areaItemClone);

                    // Mouse move & up Events
                    this.DOM.scope.on('mousemove.reposition', onAreaRepositionMouseMove );
                    $(document).on('mouseup.grid', onMouseUp);

                    ////////////////////////////
                    // mouse up callback
                    function onMouseUp(e){
                        mouseup = true;
                        $(document).off('mouseup.grid');
                        window.getSelection().removeAllRanges(); // fix any text selection (by "releasing" it) that might have ocur on the document

                        areaItem.removeClass('grid__area--dragged');
                        that.DOM.scope.removeClass('dragging').off('mousemove.reposition');

                        var selectionCells = that.getAreaRange(lastAreaCords, [lastAreaCords[0] + areaSize.x - 1, lastAreaCords[1] + areaSize.y - 1]),
                            overlap        = areaItem.hasClass('grid__area--invalid'); // try to select the cells (if not overlapping occured)

                        areaItem.removeClass('grid__area--invalid');

                        if( overlap ){
                            areaItemClone.remove();
                            areaItem.addClass('grid__area--snapBack');
                            RAF(function(){
                                areaItem.css( that.getAreaCssPosition(boxArea) );
                                // areaItem.css({ left:boxArea.cols[0] * that.settings.gridItemW + '%', top:boxArea.rows[0] * that.settings.gridItemH + '%' });
                            });

                            setTimeout(function(){ areaItem.removeClass('grid__area--snapBack') }, 500);
                        }
                        else{
                            RAF(function(){
                                that.setAreaProperties(areaItem, selectionCells);
                            });

                            setTimeout(function(){ areaItemClone.remove() }, 300);
                        }
                    }

                    ////////////////////////////
                    // mouse move callback
                    function onAreaRepositionMouseMove(e){
                        RAF(function(){
                            if( mouseup ) return; // make sure nothing will happen after "mouseup" was invoked

                            destPos = that.getGridPosByCords( {x:e.clientX, y:e.clientY}, offset);

                            var vaildColumnCords = destPos[0] + areaSize.x > that.settings.columns,
                                vaildRowCords    = destPos[1] + areaSize.y > that.settings.rows,
                                xExceedsRight    = areaItem[0].clientWidth  + e.clientX - mouseDownEvent.offsetX > that.DOM.scope[0].clientWidth  + offset.left,
                                yExceedsBottom   = areaItem[0].clientHeight + e.clientY - mouseDownEvent.offsetY > that.DOM.scope[0].clientHeight + offset.top,
                                yExceedsTop      = e.clientY - mouseDownEvent.offsetY - offset.top < 0,
                                areaPos          = {
                                    left : e.clientX - offset.left - mouseDownEvent.offsetX - 8 + 'px',
                                    top  : e.clientY - offset.top  - mouseDownEvent.offsetY - 8 + 'px'
                                },
                                overlap = !!that.detectOverlap().length;

                            //////////////////////////////
                            // position the "real" area
                            areaItem[0].style.left = areaPos.left;
                            areaItem[0].style.top  = areaPos.top;

                            // detect *any* overlap that might exist and set a class if so
                            areaItem.toggleClass('grid__area--invalid', overlap);

                            // return the rummy to it's preior position
                            // areaItemClone.addClass('grid__area--snapBack').css( that.getAreaCssPosition(boxArea) );

                            areaItemClone.removeClass('grid__area--snapBack')

                            if( vaildColumnCords )
                                destPos[0] = that.settings.columns - areaSize.x;

                            if( vaildRowCords )
                                destPos[1] = that.settings.rows - areaSize.y;


                            // don't update clone styles if no change is needed
                            if( destPos[0] != lastAreaCords[0] || destPos[1] != lastAreaCords[1] ){
                                // snap the clone to allowed grid items
                                areaItemClone[0].style.left = 'calc(' + destPos[0] * that.settings.gridItemW + '%)';
                                areaItemClone[0].style.top  = 'calc(' + destPos[1] * that.settings.gridItemH + '%)';

                                lastAreaCords = destPos;
                            }

                            if( overlap )
                                lastAreaCords = boxArea;

                            // freelly move the area itself (within the allowed grid)
                            // if( xExceedsRight )
                            //     areaPos.left = that.DOM.scope[0].clientWidth - areaItem[0].clientWidth + 'px';

                            // if( yExceedsBottom )
                            //     areaPos.top = that.DOM.scope[0].clientHeight - areaItem[0].clientHeight + 'px';

                            // if( yExceedsTop )
                            //     areaPos.top = '0px';
                        });
                    }
                },

                ////////////////////////////
                // When an Area has been defined
                onSelectedGrid(e, selectedGrid){
                    // this.clearAllSelected();
                    // this.renderArea(selectedGrid);
                },

                ////////////////////////////
                // Removing (deleting) an Area
                onRemoveAreaBtnClick(e){
                    var areaElm = $(e.currentTarget).closest('.grid__area').addClass('removed');
                    this.removeArea(areaElm);
                }
            }
        }
    }

    return Grid;
})();



//////////////////////////////////////

$.when( $.get("https://npmcdn.com/packery@2.0/dist/packery.pkgd.min.js") );

var grid = new Grid().init(),
    packery;

$(document.body).append( grid.DOM.scope.addClass('editMode') );

///////////////
// events

$('.pack').on('click', onPackBtnClick);
$('.clearAll').on('click', onClearAllBtnClick);

function onPackBtnClick(){
  if( packery ){
      packery.packery('reloadItems');
      packery.packery('layout');
  }

  else{
      packery = grid.DOM.scope.packery({
          itemSelector    : '.grid__area',
          resizeContainer : false,
          percentPosition : true,
          resize          : false,
          gutter          : 1,
          containerStyle  : null
      }).on( 'layoutComplete', function(){} );
  }
}


function onClearAllBtnClick(){
  grid.DOM.scope.find('.grid__area').remove();
}
