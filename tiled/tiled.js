game.module(
    'plugins.tiled'
)
.body(function() {

/**
    @class TileMap
    @constructor
    @param {String} json Filename of Tiled JSON file
**/
game.createClass('TileMap', {
    layers: {},
    tiles: [],
    tileWidth: 0,
    tileHeight: 0,
    orientation: 'orthogonal',

    init: function(json) {
        this.json = game.getJSON(json);
        if (!this.json) throw 'Tilemap JSON not found';

        this.tileWidth = this.json.tilewidth;
        this.tileHeight = this.json.tileheight;
        this.orientation = this.json.orientation;

        this.container = new game.Container();

        this._initTiles();
        this._initLayers();

        if (game.TileMap.cacheAsBitmap) this.container.cacheAsBitmap = true;
    },

    /**
        Init tiles, internal use only
        @method _initTiles
    **/
    _initTiles: function() {
        var tileIndex = 0;
        for (var i = 0; i < this.json.tilesets.length; i++) {
            var tileset = this.json.tilesets[i];
            var tileset_path = null;

            if (typeof tileset.image !== 'undefined') {
                tileset_path = game.config.mediaFolder ? game.config.mediaFolder + '/' + tileset.image : tileset.image;

                var tilesInRow = Math.floor(tileset.imagewidth / tileset.tilewidth);
                var tilesInCol = Math.floor(tileset.imageheight / tileset.tileheight);
                var tileCount = tilesInRow * tilesInCol;
            }
            else if (typeof tileset.tiles !== 'undefined') {
                var path = null;
                var tileCount = Object.keys(tileset.tiles).length;
            }

            for (var index = 0; index < tileCount; index++) {
                var currentRow = Math.floor(index / tilesInRow);
                var currentCol = Math.floor(index % tilesInRow);
                var path = null;

                var x = tileset.tilewidth * Math.floor(index % tilesInRow);
                x += tileset.margin;
                x += tileset.spacing * currentCol;

                var y = tileset.tileheight * Math.floor(index / tilesInRow);
                y += tileset.margin;
                y += tileset.spacing * currentRow;

                if (tileset_path === null) {
                    path = game.config.mediaFolder ? game.config.mediaFolder + '/' + tileset.tiles[index].image : tileset.tiles[index].image;
                    var frame = {
                        x: 0,
                        y: 0,
                        width: game.TextureCache[path].width,
                        height: game.TextureCache[path].height
                    };
                }
                else {
                    path = tileset_path;
                    var frame = {
                        x: x,
                        y: y,
                        width: tileset.tilewidth,
                        height: tileset.tileheight
                    };
                }

                var texture = new game.Texture(game.BaseTexture.cache[path], frame.x, frame.y, frame.width, frame.height);

                this.tiles[tileIndex + index] = texture;
            }
            tileIndex += index;
        }
    },

    /**
        Init layers, internal use only
        @method _initLayers
    **/
    _initLayers: function() {
        for (var i = 0; i < this.json.layers.length; i++) {
            var layer = this.json.layers[i];
            var container = new game.Container();

            for (var o = 0; o < layer.data.length; o++) {
                if (layer.data[o] === 0) continue;

                var tile = this.getTile(layer.data[o]);
                var x = (o % layer.width);
                var y = Math.floor(o / layer.height);
                var position = this.getPosition(x, y);
                tile.anchor.set(
                    0.5,
                    1 - this.tileHeight / tile.height
                );
                tile.position.x = position.x;
                tile.position.y = position.y;
                tile.addTo(container);
            }

            container.position.set(layer.x, layer.y);
            container.alpha = layer.opacity;
            container.visible = layer.visible;
            if (game.TileMap.cacheLayersAsBitmap) container.cacheAsBitmap = true;
            container.addTo(this.container);

            this.layers[layer.name] = container;
        }
    },

    /**
        Get the screen position for a specific coordinate, this is dependent on the type of map
        @method getPosition
        @param {Number} x
        @param {Number} y
        @return {Object} Object with x and y screen coords
    **/
    getPosition: function (x, y) {
        var tileWidth = this.tileWidth;
        var tileHeight = this.tileHeight;

        if (this.orientation === 'orthogonal') {
            return {
                x: x * tileWidth,
                y: y * tileHeight,
            };
        }
        else if (this.orientation === 'isometric') {
            return {
                x: (x - y) * (tileWidth / 2),
                y: (x + y) * (tileHeight / 2)
            };
        }
        return false;
    },

    /**
        Creates a new tile Sprite and returns it
        @method getTile
        @param {Number} index
        @return {game.Sprite} New tile Sprite
    **/
    getTile: function(index) {
        return new game.Sprite(this.tiles[index - 1]);
    },

    /**
        Add tilemap to container
        @method addTo
        @param {game.Container} container
    **/
    addTo: function(container) {
        this.container.addTo(container);
    },

    /**
        Get the layer names defined in the JSON source
        @method getLayerNames
        @return {Array} An array with the layer names
    **/
    getLayerNames: function () {
        return Object.keys(this.json.layers);
    },

    /**
        Get the tile ID at specific coordinates
        @method getTileIdAt
        @param {String} layerName The layer name from which we should get the data
        @param {Number} x x coordinate
        @param {Number} y y coordinate
        @return {Mixed} The ID or false when not found
    **/
    getTileIdAt: function (layerName, x, y) {
        var layer = this.getLayer(layerName);
        var index = y * layer.width + x;

        if (typeof layer.data[index] !== 'undefined') return layer.data[index - 1];
        return false;
    },

    /**
        Gets the layer's tile id's presented in a matrix style array
        @method getLayerMatrix
        @param {String} layerName The layer name from which we should get the data
        @return {Array} Multi-dimensional array, rows and columns, containing tile ID's
    **/
    getLayerMatrix: function (layerName) {
        var layer = this.getLayer(layerName);
        var colCount = layer.width;
        var rowCount = Math.ceil(layer.data.length / colCount);
        var matrix = [];
        var i = 0;

        for (var y = 0; y < rowCount; y++) {
            var row = [];
            for (var x = 0; x < colCount; x++) {
                row.push(layer.data[i]);
                i++;
            }
            matrix.push(row);
        }

        return matrix;
    },

    /**
        Get the tile properties defined in the JSON's tilesets
        @method getLayerMatrix
        @return {Object} Tile properties object
    **/
    getTileProperties: function () {
        // @TODO Currently, the Tiled editor seems to only be able to store one
        // tileset's data to the JSON. Hopefully, this will change in the
        // future and then this should be adjusted accordingly.
        return this.json.tilesets[0].tileproperties;
    },

    /**
        Get a specific layer from the JSON file
        @method getLayer
        @return {Mixed} Layer object or false when not found
    **/
    getLayer: function (layerName) {
        for (var i = 0; i < this.json.layers.length; i++) {
            var layer = this.json.layers[i];
            if (layer.name === layerName) return layer;
        }
        return false;
    },

    /**
        Remove the container from it's parent
        @method remove
    **/
    remove: function() {
        if (this.container.parent) this.container.parent.removeChild(this.container);
    }
});

game.TileMap.cacheLayersAsBitmap = false;
game.TileMap.cacheAsBitmap = false;

});
