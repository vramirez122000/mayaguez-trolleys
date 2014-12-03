var DEFAULTS = {
    CENTER: [18.2011, -67.1396],
    ZOOM: 13,
    MIN_ZOOM: 10,
    MAX_ZOOM: 19,
    BOUNDS: [[18.352687, -66.179752],[18.477284, -65.928097]],
    ROUTE_COLOR_OPACITY: 0.65
};

function shadeColor(color, percent) {
    var num = parseInt(color.slice(1),16);
    var amt = Math.round(2.55 * percent);
    var R = (num >> 16) + amt;
    var B = (num >> 8 & 0x00FF) + amt;
    var G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255))
            .toString(16).slice(1);
}

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

function getAllRoutes(mapState) {
    $.ajax('rutas.geojson', {
        contentType: 'application/json; charset=UTF-8',
        dataType: 'json',
        success: function (geojsonRoutes) {
            for (var i = 0; i < geojsonRoutes.features.length; i++) {
                var data = geojsonRoutes.features[i];
                var geoJsonLayer = L.geoJson(data, {
                    style: routeStyle,
                    onEachFeature: onEachRoute
                });
                mapState.routeLayers[data.id] = geoJsonLayer;
                var darkColor = data.properties.color;
                var lightColor = shadeColor(data.properties.color, 100 - (DEFAULTS.ROUTE_COLOR_OPACITY * 100));
                var routeLabel = '<span class="routeLabel" style="' +
                    'background-color: ' + lightColor +
                    '; text-shadow: -1px 0 ' + darkColor + ', 0 1px ' + darkColor + ', 1px 0 ' + darkColor + ', 0 -1px ' + darkColor +
                    '; border-color: ' + darkColor + '">' + (data.properties.nombre) + '</span>';
                geoJsonLayer.addTo(mapState.map);
                mapState.layerControl.addOverlay(geoJsonLayer, routeLabel);
            }
            if(mapState.markerGroup.getLayers().length) {
                mapState.markerGroup.bringToFront();
            }
            mapState.map.locate({setView: true, maxZoom: 13, enableHighAccuracy: true});
        }
    });
}

function getPoints(mapState) {
    $.ajax('puntos.geojson', {
        contentType: 'application/json; charset=UTF-8',
        dataType: 'json',
        success: function (geojson) {
            for (var i = 0; i < geojson.features.length; i++) {
                var data = geojson.features[i];
                var marker = L.circleMarker(data.geometry.coordinates.reverse(), {
                    color: '#333333',
                    fillColor: '#ffffff',
                    fillOpacity: 9,
                    radius: '5'
                });
                mapState.markerGroup.addLayer(marker);
            }
            mapState.markerGroup.addTo(mapState.map);
        }
    });
}

function routeStyle(feature) {
    return {
        weight: 6,
        opacity: DEFAULTS.ROUTE_COLOR_OPACITY,
        color: feature.properties.color
    };
}

function onEachRoute(feature, layer) {
    layer.bindPopup(feature.properties.nombre);
    layer.on("click", function() {
        layer.bringToFront();
        markerGroup.bringToFront();
    });
}