var math = require('../math'),
    Texture = require('../textures/Texture'),
    Container = require('../display/Container'),
    utils = require('../utils'),
    CONST = require('../const'),
    tempPoint = new math.Point();

/**
 * The Sprite object is the base for all textured objects that are rendered to the screen
 *
 * A sprite can be created directly from an image like this:
 *
 * ```js
 * var sprite = new PIXI.Sprite.fromImage('assets/image.png');
 * ```
 *
 * @class
 * @extends PIXI.Container
 * @memberof PIXI
 * @param texture {PIXI.Texture} The texture for this sprite
 */
function Sprite(texture)
{
    Container.call(this);

    /**
     * The anchor sets the origin point of the texture.
     * The default is 0,0 this means the texture's origin is the top left
     * Setting the anchor to 0.5,0.5 means the texture's origin is centered
     * Setting the anchor to 1,1 would mean the texture's origin point will be the bottom right corner
     *
     * @member {PIXI.Point}
     */
    this.anchor = new math.Point();

    /**
     * The texture that the sprite is using
     *
     * @member {PIXI.Texture}
     * @private
     */
    this._texture = null;

    /**
     * The width of the sprite (this is initially set by the texture)
     *
     * @member {number}
     * @private
     */
    this._width = 0;

    /**
     * The height of the sprite (this is initially set by the texture)
     *
     * @member {number}
     * @private
     */
    this._height = 0;

    /**
     * The tint applied to the sprite. This is a hex value. A value of 0xFFFFFF will remove any tint effect.
     *
     * @member {number}
     * @default 0xFFFFFF
     */
    this.tint = 0xFFFFFF;

    /**
     * The blend mode to be applied to the sprite. Apply a value of `PIXI.BLEND_MODES.NORMAL` to reset the blend mode.
     *
     * @member {number}
     * @default PIXI.BLEND_MODES.NORMAL
     * @see PIXI.BLEND_MODES
     */
    this.blendMode = CONST.BLEND_MODES.NORMAL;

    /**
     * The shader that will be used to render the sprite. Set to null to remove a current shader.
     *
     * @member {PIXI.AbstractFilter|PIXI.Shader}
     */
    this.shader = null;

    /**
     * An internal cached value of the tint.
     *
     * @member {number}
     * @default 0xFFFFFF
     */
    this.cachedTint = 0xFFFFFF;

    // call texture setter
    this.texture = texture || Texture.EMPTY;
    this.textureDirty = true;
    this.vertexData = new Float32Array(16);
}

// constructor
Sprite.prototype = Object.create(Container.prototype);
Sprite.prototype.constructor = Sprite;
module.exports = Sprite;

Object.defineProperties(Sprite.prototype, {
    /**
     * The width of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof PIXI.Sprite#
     */
    width: {
        get: function ()
        {
            return Math.abs(this.scale.x) * this.texture.orig.width;
        },
        set: function (value)
        {
            var sign = utils.sign(this.scale.x) || 1;
            this.scale.x = sign * value / this.texture.orig.width;
            this._width = value;
        }
    },

    /**
     * The height of the sprite, setting this will actually modify the scale to achieve the value set
     *
     * @member {number}
     * @memberof PIXI.Sprite#
     */
    height: {
        get: function ()
        {
            return  Math.abs(this.scale.y) * this.texture.orig.height;
        },
        set: function (value)
        {
            var sign = utils.sign(this.scale.y) || 1;
            this.scale.y = sign * value / this.texture.orig.height;
            this._height = value;
        }
    },

    /**
     * The texture that the sprite is using
     *
     * @member {PIXI.Texture}
     * @memberof PIXI.Sprite#
     */
    texture: {
        get: function ()
        {
            return  this._texture;
        },
        set: function (value)
        {
            if (this._texture === value)
            {
                return;
            }

            this._texture = value;
            this.cachedTint = 0xFFFFFF;

            this.textureDirty = true;

            if (value)
            {
                // wait for the texture to load
                if (value.baseTexture.hasLoaded)
                {
                    this._onTextureUpdate();
                }
                else
                {
                    value.once('update', this._onTextureUpdate, this);
                }
            }
        }
    }
});

/**
 * When the texture is updated, this event will fire to update the scale and frame
 *
 * @private
 */
Sprite.prototype._onTextureUpdate = function ()
{
    this.textureDirty = true;

    // so if _width is 0 then width was not set..
    if (this._width)
    {
        this.scale.x = utils.sign(this.scale.x) * this._width / this.texture.orig.width;
    }

    if (this._height)
    {
        this.scale.y = utils.sign(this.scale.y) * this._height / this.texture.orig.height;
    }
};

/**
 * calculates worldTransform * vertices, store it in vertexData
 */
Sprite.prototype.calculateVertices = function ()
{
    var texture = this._texture,
        wt = this.transform.worldTransform,
        a = wt.a, b = wt.b, c = wt.c, d = wt.d, tx = wt.tx, ty = wt.ty,
        vertexData = this.vertexData,
        w0, w1, h0, h1,
        trim = texture.trim,
        orig = texture.orig;

    if (trim)
    {
        // if the sprite is trimmed and is not a tilingsprite then we need to add the extra space before transforming the sprite coords..
        w1 = trim.x - this.anchor.x * orig.width;
        w0 = w1 + trim.width;

        h1 = trim.y - this.anchor.y * orig.height;
        h0 = h1 + trim.height;

    }
    else
    {
        w0 = (orig.width ) * (1-this.anchor.x);
        w1 = (orig.width ) * -this.anchor.x;

        h0 = orig.height * (1-this.anchor.y);
        h1 = orig.height * -this.anchor.y;
    }

    // xy
    vertexData[0] = a * w1 + c * h1 + tx;
    vertexData[1] = d * h1 + b * w1 + ty;

    // xy
    vertexData[2] = a * w0 + c * h1 + tx;
    vertexData[3] = d * h1 + b * w0 + ty;

     // xy
    vertexData[4] = a * w0 + c * h0 + tx;
    vertexData[5] = d * h0 + b * w0 + ty;

    // xy
    vertexData[6] = a * w1 + c * h0 + tx;
    vertexData[7] = d * h0 + b * w1 + ty;
};

/**
 * we need this method to be compatible with pixiv3. v3 does calculate bounds of original texture are, not trimmed one
 */
Sprite.prototype.calculateBoundsVertices = function ()
{
    var texture = this._texture,
        trim = texture.trim,
        vertexData = this.vertexData,
        orig = texture.orig;

    if (!trim || trim.width === orig.width && trim.height === orig.height) {
        vertexData[8] = vertexData[0];
        vertexData[9] = vertexData[1];
        vertexData[10] = vertexData[2];
        vertexData[11] = vertexData[3];
        vertexData[12] = vertexData[4];
        vertexData[13] = vertexData[5];
        vertexData[14] = vertexData[6];
        vertexData[15] = vertexData[7];
        return;
    }

    var wt = this.transform.worldTransform,
        a = wt.a, b = wt.b, c = wt.c, d = wt.d, tx = wt.tx, ty = wt.ty,
        w0, w1, h0, h1;


    w0 = (orig.width ) * (1-this.anchor.x);
    w1 = (orig.width ) * -this.anchor.x;

    h0 = orig.height * (1-this.anchor.y);
    h1 = orig.height * -this.anchor.y;

    // xy
    vertexData[8] = a * w1 + c * h1 + tx;
    vertexData[9] = d * h1 + b * w1 + ty;

    // xy
    vertexData[10] = a * w0 + c * h1 + tx;
    vertexData[11] = d * h1 + b * w0 + ty;

    // xy
    vertexData[12] = a * w0 + c * h0 + tx;
    vertexData[13] = d * h0 + b * w0 + ty;

    // xy
    vertexData[14] = a * w1 + c * h0 + tx;
    vertexData[15] = d * h0 + b * w1 + ty;
};

/**
*
* Renders the object using the WebGL renderer
*
* @param renderer {PIXI.WebGLRenderer}
* @private
*/
Sprite.prototype._renderWebGL = function (renderer)
{
    if(this.transform.updated || this.textureDirty)
    {
        this.textureDirty = false;
        // set the vertex data
        this.calculateVertices();
    }

    renderer.setObjectRenderer(renderer.plugins.sprite);
    renderer.plugins.sprite.render(this);
};

/**
* Renders the object using the Canvas renderer
*
* @param renderer {PIXI.CanvasRenderer} The renderer
* @private
*/
Sprite.prototype._renderCanvas = function (renderer)
{
    renderer.plugins.sprite.render(this);
};


/**
 * Returns the bounds of the Sprite as a rectangle. The bounds calculation takes the worldTransform into account.
 *
 * @return {PIXI.Rectangle} the framing rectangle
 */
Sprite.prototype.getBounds = function ()
{
    //TODO lookinto caching..
    if(!this._currentBounds)
    {
       // if(this.vertexDirty)
        {
            this.vertexDirty = false;

            // set the vertex data
            this.calculateBoundsVertices();

        }

        var minX, maxX, minY, maxY,
            w0, w1, h0, h1,
            vertexData = this.vertexData;

        var x1 = vertexData[8];
        var y1 = vertexData[9];

        var x2 = vertexData[10];
        var y2 = vertexData[11];

        var x3 = vertexData[12];
        var y3 = vertexData[13];

        var x4 = vertexData[14];
        var y4 = vertexData[15];

        minX = x1;
        minX = x2 < minX ? x2 : minX;
        minX = x3 < minX ? x3 : minX;
        minX = x4 < minX ? x4 : minX;

        minY = y1;
        minY = y2 < minY ? y2 : minY;
        minY = y3 < minY ? y3 : minY;
        minY = y4 < minY ? y4 : minY;

        maxX = x1;
        maxX = x2 > maxX ? x2 : maxX;
        maxX = x3 > maxX ? x3 : maxX;
        maxX = x4 > maxX ? x4 : maxX;

        maxY = y1;
        maxY = y2 > maxY ? y2 : maxY;
        maxY = y3 > maxY ? y3 : maxY;
        maxY = y4 > maxY ? y4 : maxY;

        // check for children
        if(this.children.length)
        {
            var childBounds = this.containerGetBounds();

            w0 = childBounds.x;
            w1 = childBounds.x + childBounds.width;
            h0 = childBounds.y;
            h1 = childBounds.y + childBounds.height;

            minX = (minX < w0) ? minX : w0;
            minY = (minY < h0) ? minY : h0;

            maxX = (maxX > w1) ? maxX : w1;
            maxY = (maxY > h1) ? maxY : h1;
        }

        var bounds = this._bounds;

        bounds.x = minX;
        bounds.width = maxX - minX;

        bounds.y = minY;
        bounds.height = maxY - minY;

        // store a reference so that if this function gets called again in the render cycle we do not have to recalculate
        this._currentBounds = bounds;
    }

    return this._currentBounds;
};

/**
 * Gets the local bounds of the sprite object.
 *
 */
Sprite.prototype.getLocalBounds = function ()
{
    this._bounds.x = -this._texture.orig.width * this.anchor.x;
    this._bounds.y = -this._texture.orig.height * this.anchor.y;
    this._bounds.width = this._texture.orig.width;
    this._bounds.height = this._texture.orig.height;
    return this._bounds;
};

/**
* Tests if a point is inside this sprite
*
* @param point {PIXI.Point} the point to test
* @return {boolean} the result of the test
*/
Sprite.prototype.containsPoint = function( point )
{
    this.worldTransform.applyInverse(point,  tempPoint);

    var width = this._texture.orig.width;
    var height = this._texture.orig.height;
    var x1 = -width * this.anchor.x;
    var y1;

    if ( tempPoint.x > x1 && tempPoint.x < x1 + width )
    {
        y1 = -height * this.anchor.y;

        if ( tempPoint.y > y1 && tempPoint.y < y1 + height )
        {
            return true;
        }
    }

    return false;
};


/**
 * Destroys this sprite and optionally its texture and children
 *
 * @param [options] {object|boolean} Options parameter. A boolean will act as if all options have been set to that value
 * @param [options.children=false] {boolean} if set to true, all the children will have their destroy
 *      method called as well. 'options' will be passed on to those calls.
 * @param [options.texture=false] {boolean} Should it destroy the current texture of the sprite as well
 * @param [options.baseTexture=false] {boolean} Should it destroy the base texture of the sprite as well
 */
Sprite.prototype.destroy = function (options)
{
    Container.prototype.destroy.call(this, options);

    this.anchor = null;

    var destroyTexture = typeof options === 'boolean' ? options : options && options.texture;
    if (destroyTexture)
    {
        var destroyBaseTexture = typeof options === 'boolean' ? options : options && options.baseTexture;
        this._texture.destroy(!!destroyBaseTexture);
    }

    this._texture = null;
    this.shader = null;
};

// some helper functions..

/**
 * Helper function that creates a new sprite based on the source you provide.
 * The soucre can be - frame id, image url, video url, canvae element, video element, base texture
 *
 * @static
 * @param source {}
 * @return {PIXI.Texture} A Texture
 */
Sprite.from = function (source)
{
    return new Sprite(Texture.from(source));
};

/**
 * Helper function that creates a sprite that will contain a texture from the TextureCache based on the frameId
 * The frame ids are created when a Texture packer file has been loaded
 *
 * @static
 * @param frameId {string} The frame Id of the texture in the cache
 * @return {PIXI.Sprite} A new Sprite using a texture from the texture cache matching the frameId
 */
Sprite.fromFrame = function (frameId)
{
    var texture = utils.TextureCache[frameId];

    if (!texture)
    {
        throw new Error('The frameId "' + frameId + '" does not exist in the texture cache');
    }

    return new Sprite(texture);
};

/**
 * Helper function that creates a sprite that will contain a texture based on an image url
 * If the image is not in the texture cache it will be loaded
 *
 * @static
 * @param imageId {string} The image url of the texture
 * @param [crossorigin=(auto)] {boolean} if you want to specify the cross-origin parameter
 * @param [scaleMode=PIXI.SCALE_MODES.DEFAULT] {number} if you want to specify the scale mode, see {@link PIXI.SCALE_MODES} for possible values
 * @return {PIXI.Sprite} A new Sprite using a texture from the texture cache matching the image id
 */
Sprite.fromImage = function (imageId, crossorigin, scaleMode)
{
    return new Sprite(Texture.fromImage(imageId, crossorigin, scaleMode));
};
