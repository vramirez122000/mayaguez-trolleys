var DEFAULTS = {
    CENTER: [18.2011, -67.1396],
    ZOOM: 13,
    MIN_ZOOM: 10,
    MAX_ZOOM: 19,
    BOUNDS: [[18.352687, -66.179752],[18.477284, -65.928097]],
    ROUTE_COLOR_OPACITY: 0.8
};

function main() {
    var mapState = {
        colors: {},
        markerGroup: L.featureGroup(),
        layerControl: L.control.layers(null, {}, {position: 'topleft', collapsed: false}),
        map: createMap(),
        param : getParam('maptype')
    };

    tileLayer().addTo(mapState.map);
    getAllRoutes(mapState);
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
                if(mapState.param && data.properties.nombre.indexOf(mapState.param) == -1) {
                    continue;
                }
                var geoJsonLayer = L.geoJson(data, {
                    style: createRouteStyleFunction(mapState),
                    onEachFeature: createOnEachRouteFunction(mapState)
                });
                mapState.colors[data.properties.nombre] = data.properties.color;
                var lightColor = data.properties.color;
                var darkColor = shadeColor(data.properties.color, -25);
                var routeLabel = '<span class="routeLabel" style="' +
                    'background-color: ' + lightColor +
                    '; text-shadow: -1px 0 ' + darkColor + ', 0 1px ' + darkColor + ', 1px 0 ' + darkColor + ', 0 -1px ' + darkColor +
                    '; border-color: ' + darkColor + '">' + (data.properties.nombre) + '</span>';

                if(mapState.param == data.properties.nombre) {

                }
                geoJsonLayer.addTo(mapState.map);
                mapState.layerControl.addOverlay(geoJsonLayer, routeLabel);
            }
            if(mapState.markerGroup.getLayers().length) {
                mapState.markerGroup.bringToFront();
            }
            mapState.layerControl.addTo(mapState.map);
            getPoints(mapState);
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
                var routeName = data.properties.text.substr(0, 2);
                var color = mapState.colors[routeName];
                var fillColor = color || '#ffffff';
                var borderColor = color && shadeColor(fillColor, -30) || '#555555';

                var marker = L.circleMarker(data.geometry.coordinates.reverse(), {
                    color: borderColor,
                    fillColor: fillColor,
                    fillOpacity: 1,
                    radius: '6'
                });
                marker.bindPopup(data.properties.text);
                mapState.markerGroup.addLayer(marker);
            }
            mapState.markerGroup.addTo(mapState.map);
        }
    });
}

function createRouteStyleFunction(mapState) {
    return function(feature) {
        var style = {
            weight: 6,
            opacity: DEFAULTS.ROUTE_COLOR_OPACITY,
            color: feature.properties.color,
            lineCap: 'butt'
        };
        if(feature.properties.nombre.indexOf('Rural') > -1) {
            style.dashArray = '10,4';
        }
        return style;
    };
}

function createOnEachRouteFunction(mapState) {
    return function(feature, layer) {
        layer.bindPopup(feature.properties.nombre);
        layer.on("click", function() {
            layer.bringToFront();
            mapState.markerGroup.bringToFront();
        });
    };
}

function getParam(name){
    var paramKeyValPair = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(location.search);
    if(paramKeyValPair) {
        var decoded = decodeURIComponent(paramKeyValPair[1]);
        if(decoded.indexOf('/') == (decoded.length - 1)) {
            decoded = decoded.substring(0, decoded.length - 1);
        }
        return decoded;
    }
}

function shadeColor(color, percent) {
    var num = parseInt(color.slice(1),16);
    var amt = Math.round(2.55 * percent);
    var R = (num >> 16) + amt;
    var B = (num >> 8 & 0x00FF) + amt;
    var G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255))
            .toString(16).slice(1);
}