var maya = (function () {

    var my = {};

    var DEFAULTS = {
        CENTER: [18.2011, -67.1396],
        ZOOM: 13,
        MIN_ZOOM: 10,
        MAX_ZOOM: 19,
        BOUNDS: [[18.352687, -66.179752], [18.477284, -65.928097]],
        ROUTE_COLOR_OPACITY: 0.8
    };

    my.main = function () {
        var param = getParam('routes');
        var routes = param && param.split(',') || [];
        var mapState = {
            colors: {},
            stopGroups: {},
            routeLayers: {},
            routeGroup: L.featureGroup(),
            poiGroup: L.featureGroup(),
            layerControl: L.control.layers(null, {}, {position: 'topleft', collapsed: false}),
            map: createMap(),
            routes: routes
        };

        tileLayer().addTo(mapState.map);
        getAllRoutes(mapState, function() {
            getPoints(mapState, function() {
                mapState.map.fitBounds(mapState.routeGroup.getBounds());
                getPois(mapState, function(){});
                mapState.map.on('overlayadd', function(event) {
                    var routeId = $(event.name).data('route-id');
                    if(!routeId) {
                        return;
                    }
                    if(!mapState.map.hasLayer(mapState.stopGroups[routeId])) {
                        mapState.map.addLayer(mapState.stopGroups[routeId]);
                    }
                });
                mapState.map.on('overlayremove', function(event) {
                    var routeId = $(event.name).data('route-id');
                    if(!routeId) {
                        return;
                    }
                    if(mapState.map.hasLayer(mapState.stopGroups[routeId])) {
                        mapState.map.removeLayer(mapState.stopGroups[routeId]);
                    }
                });
            });
        });
    };

    function createMap() {
        return L.map('map', {
            center: DEFAULTS.CENTER,
            zoom: DEFAULTS.ZOOM
        });
    }

    function tileLayer() {
        var url = 'https://{s}.tiles.mapbox.com/v3/vramirez122000.kc4acpgn/{z}/{x}/{y}.png';
        return L.tileLayer(url, {
            minZoom: DEFAULTS.MIN_ZOOM,
            maxZoom: DEFAULTS.MAX_ZOOM,
            maxBounds: DEFAULTS.BOUNDS,
            attribution: '<a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap Contributors</a>'
        });
    }

    function getAllRoutes(mapState, onComplete) {
        $.ajax('rutas.geojson', {
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json',
            success: function (geojsonRoutes) {
                for (var i = 0; i < geojsonRoutes.features.length; i++) {
                    var data = geojsonRoutes.features[i];
                    if (mapState.routes.length > 0 && mapState.routes.indexOf(data.id) == -1) {
                        continue;
                    }
                    var geoJsonLayer = L.geoJson(data, {
                        style: createRouteStyleFunction(),
                        onEachFeature: createOnEachRouteFunction(mapState)
                    });
                    mapState.colors[data.id] = data.properties.color;
                    var lightColor = data.properties.color;
                    var darkColor = shadeColor(data.properties.color, -25);
                    var routeLabel = '<span class="routeLabel" ' +
                        'data-route-id="' + data.id + '" style="' +
                        'background-color: ' + lightColor +
                        '; text-shadow: -1px 0 ' + darkColor + ', 0 1px ' + darkColor + ', 1px 0 ' + darkColor + ', 0 -1px ' + darkColor +
                        '; border-color: ' + darkColor + '">' + (data.properties.nombre) + '</span>';

                    mapState.routeGroup.addLayer(geoJsonLayer); //calc bounds
                    geoJsonLayer.addTo(mapState.map);
                    mapState.routeLayers[data.id] = geoJsonLayer;
                    mapState.layerControl.addOverlay(geoJsonLayer, routeLabel);
                }
                mapState.layerControl.addTo(mapState.map);
            },
            complete: onComplete
        });
    }

    function getPoints(mapState, onComplete) {
        $.ajax('paradas.geojson', {
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json',
            success: function (geojson) {
                for (var i = 0; i < geojson.features.length; i++) {
                    var data = geojson.features[i];
                    var routeId = data.properties.route;
                    if(!(routeId in mapState.colors)) {
                        continue;
                    }
                    var color = mapState.colors[routeId];
                    var fillColor = color || '#ffffff';
                    var borderColor = color && shadeColor(fillColor, -30) || '#555555';

                    var marker = L.circleMarker(data.geometry.coordinates.reverse(), {
                        color: borderColor,
                        fillColor: fillColor,
                        fillOpacity: 1
                    });
                    marker.setRadius(+6); //warning hack!! force numeric
                    marker.bindPopup(data.properties.text);

                    if(!mapState.stopGroups[routeId]) {
                        mapState.stopGroups[routeId] = L.featureGroup();
                    }
                    mapState.stopGroups[routeId].addLayer(marker);
                }

                for (var stopGroup in mapState.stopGroups) {
                    if (!mapState.stopGroups.hasOwnProperty(stopGroup)) {
                        continue;
                    }
                    mapState.map.addLayer(mapState.stopGroups[stopGroup]);
                }
            },
            complete: onComplete
        });
    }

    function getPois(mapState, onComplete) {
        $.ajax('poi.geojson', {
            contentType: 'application/json; charset=UTF-8',
            dataType: 'json',
            success: function (geojson) {
                for (var i = 0; i < geojson.features.length; i++) {
                    var data = geojson.features[i];

                    var iconProps = {
                        prefix: 'fa'
                    };

                    if(data.properties.color) {
                        iconProps.markerColor = data.properties.color;
                    }
                    if(data.properties.icon) {
                        iconProps.icon = data.properties.icon;
                    }

                    var marker = L.marker(data.geometry.coordinates.reverse(), {
                        icon: L.AwesomeMarkers.icon(iconProps)
                    });
                    marker.bindPopup(data.properties.name);
                    mapState.poiGroup.addLayer(marker);
                }
                //mapState.poiGroup.addTo(mapState.map);
                mapState.layerControl.addOverlay(mapState.poiGroup, 'Puntos de Referencia');
            },
            complete: onComplete
        });
    }

    function createRouteStyleFunction() {
        return function (feature) {
            var style = {
                weight: 6,
                opacity: DEFAULTS.ROUTE_COLOR_OPACITY,
                color: feature.properties.color,
                lineCap: 'butt'
            };
            if (feature.id.indexOf('RU') > -1) {
                style.dashArray = '10,4';
            }
            return style;
        };
    }

    function createOnEachRouteFunction(mapState) {
        return function (feature, layer) {
            layer.bindPopup(feature.properties.nombre);
            layer.on("click", function () {
                layer.bringToFront();
                mapState.stopGroups[feature.id].bringToFront();
            });
        };
    }

    function getParam(name) {
        var paramKeyValPair = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search);
        if (paramKeyValPair) {
            var decoded = decodeURIComponent(paramKeyValPair[1]);
            if (decoded.indexOf('/') == (decoded.length - 1)) {
                decoded = decoded.substring(0, decoded.length - 1);
            }
            return decoded;
        }
    }

    function shadeColor(color, percent) {
        var num = parseInt(color.slice(1), 16);
        var amt = Math.round(2.55 * percent);
        var R = (num >> 16) + amt;
        var B = (num >> 8 & 0x00FF) + amt;
        var G = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (B < 255 ? B < 1 ? 0 : B : 255) * 0x100 + (G < 255 ? G < 1 ? 0 : G : 255))
                .toString(16).slice(1);
    }

    return my;
})();