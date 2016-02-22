import React, { Component, cloneElement } from 'react';
import ReactDOM from 'react-dom';
import Interact from 'interact.js';
import _ from 'lodash';
import update from 'react/lib/update';

export default class Sortable extends Component {

    constructor(props) {
        super(props);
        this.renderItems = this.renderItems.bind(this);
        this.setStateFromProps = this.setStateFromProps.bind(this);
        this.handleSortable = this.handleSortable.bind(this);
        this.createClone = this.createClone.bind(this);

        this.setStateFromProps(props);
        this.sortableSelector = props.sortCssSelector || '.sortable';
        this.draggedEl;
        this.cloneElement;
    }

    setStateFromProps(props) {
        let items = [];
        React.Children.forEach(props.children, (child) => {
            let data = {
                ref: child.ref,
                child: child
            }
            items.push(data);
        });
        this.state = {items: items}
    }

    componentWillReceiveProps(nextProps) {
        this.setStateFromProps(nextProps);
    }

    componentDidUpdate() {
    }

    componentDidMount() {
        this.handleSortable();
    }

    componentWillUnmount() {
        Interact(this.sortableSelector).unset()
    }

    handleSortable() {

        var that = this;

        Interact(this.sortableSelector)
            .draggable({
                manualStart: true,
                inertia: true,
                autoScroll: true,
                onstart: function (event) {
                    // Mise à jour
                    Interact.dynamicDrop(true);
                },
                onmove: function (event) {

                    var target = event.target,
                        x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    // translate the element
                    target.style.webkitTransform =
                        target.style.transform =
                            'translate(' + x + 'px, ' + y + 'px)';
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                onend: function (event) {
                    var target = event.target;
                    target.style.webkitTransform =
                        target.style.transform =
                            'translate(0px, 0px)';
                    target.setAttribute('data-x', 0);
                    target.setAttribute('data-y', 0);
                    that.cloneElement && that.cloneElement.remove();
                }
            })

            .on('move', function (event) {
                var interaction = event.interaction;
                // if the pointer was moved while being held down
                // and an interaction hasn't started yet
                // downTargets[0] = div.photo-list-wrapper
                if (interaction.pointerIsDown
                    && !interaction.interacting()
                ) {
                    // Fix : le clique a commencé hors de l'élément
                    if (interaction.downTargets[0] == event.currentTarget) {
                        that.draggedEl = event.currentTarget;
                        var cloneEl = that.createClone(event.currentTarget);
                        that.setCss(that.draggedEl, 'opacity', '0.3');
                        interaction.start({name: 'drag'},
                            event.interactable,
                            cloneEl
                        );
                    }
                }
            })

            .dropzone({
                // only accept elements matching this CSS selector
                accept: that.sortableSelector,
                // Require a 50% element overlap for a drop to be possible
                overlap: 0.50,

                // listen for drop related events:

                ondropactivate: function (event) {
                    // add active dropzone feedback
                    event.target.classList.add('drop-active');
                },
                ondragenter: function (event) {
                    let draggedElement = event.relatedTarget,
                        dropzoneElement = event.target;

                    // feedback the possibility of a drop
                    dropzoneElement.classList.add('drop-target');
                    draggedElement.classList.add('can-drop');
                    let draggedElementId = event.relatedTarget.getAttribute("data-id"),
                        dropzoneElementId = event.target.getAttribute("data-id");
                    that.previewSort(draggedElementId, dropzoneElementId);
                },
                ondragleave: function (event) {
                    event.target.classList.remove('drop-target');
                    event.relatedTarget.classList.remove('can-drop');
                },
                ondrop: function (event) {
                    that.setCss(that.draggedEl, 'opacity', '1');
                    that.props.onSort(that.toArray());
                },
                ondropdeactivate: function (event) {
                    event.target.classList.remove('drop-active');
                    event.target.classList.remove('drop-target');
                }
            });

    }

    toArray() {
        return this.state.items.map(item => item.child.props.id);
    }


    getCss(element) {
        return (document.defaultView && document.defaultView.getComputedStyle)
            ? document.defaultView.getComputedStyle(element, '')
            : element.currentStyle
    }

    setCss(element, attribute, value) {
        var style = element && element.style;
        if (!(attribute in style)) {
            attribute = '-webkit-' + attribute;
        }
        style[attribute] = value;
    }

    createClone(element) {
        var rect = element.getBoundingClientRect(),
            css = this.getCss(element),
            cssText,
            style,
            cloneRect;
        this.cloneElement = element.cloneNode(true);

        if ("getComputedStyle" in window) {
            style = window.getComputedStyle(element, null);
            //  Fix https://bugzilla.mozilla.org/show_bug.cgi?id=137687
            if (style.cssText == "") {
                for (var i in style) {
                    cssText += style[i] + ": " + style.getPropertyValue(style[i]) + "; ";
                }
            } else {
                cssText = style.cssText;
            }

        } else {
            style = element.currentStyle;
            for (var i in style) { cssText += i + ":" + style[i] + "; "; }
        }
        this.cloneElement.style.cssText = cssText;

        this.setCss(this.cloneElement, 'top', parseInt(rect.top)-20 + 'px');
        this.setCss(this.cloneElement, 'left', parseInt(rect.left)-20 + 'px');
        this.setCss(this.cloneElement, 'width', rect.width + 'px');
        this.setCss(this.cloneElement, 'height', rect.height + 'px');
        this.setCss(this.cloneElement, 'position', 'fixed');
        this.setCss(this.cloneElement, 'zIndex', '100000');
        this.setCss(this.cloneElement, 'pointerEvents', 'none');

        this.cloneElement.className += " sort-clone-dragged";
        document.body.appendChild(this.cloneElement);

        return this.cloneElement;
    }

    previewSort(dragId, dropId) {
        var items = this.state.items;
        var dragEl = _.find(items, function (o) {
            return o.child.props.id == dragId;
        });
        var dragIndex = _.findIndex(items, function (o) {
            return o.child.props.id == dragId;
        });
        var dropIndex = _.findIndex(items, function (o) {
            return o.child.props.id == dropId;
        });
        // Déplace l'élement
        items.splice(dragIndex, 1);
        items.splice(dropIndex, 0, dragEl);
        this.state = Object.assign({}, this.state, {items: items});
        this.forceUpdate();
    }

    renderItems() {
        let children = [];
        this.state.items.map((item, i) => {
            children.push(<div key={item.child.props.id + '_'} className="sortable-item-wrapper">{ item.child }</div>);
        });
        return children;

    }

    render() {
        return (
            <div id="sortable-wrapper" key="key-wrapper">
                { this.renderItems() }
            </div>
        );
    }

}
