game.module(
	'plugins.webgl.fastspritebatch'
)
.body(function() {
	
game.createClass('WebGLFastSpriteBatch', {
	vertSize: 10,
	maxSize: 6000,
	vertexBuffer: null,
	indexBuffer: null,
	lastIndexCount: 0,
	drawing: false,
	currentBatchSize: 0,
	currentBaseTexture: null,
	currentBlendMode: 0,
	renderSession: null,
	shader: null,
	matrix: null,

	init: function() {
		this.size = this.maxSize;

		var numVerts = this.size * 4 *  this.vertSize;
		var numIndices = this.maxSize * 6;
		this.vertices = new game.Float32Array(numVerts);
		this.indices = new game.Uint16Array(numIndices);

		for (var i=0, j=0; i < numIndices; i += 6, j += 4) {
		    this.indices[i + 0] = j + 0;
		    this.indices[i + 1] = j + 1;
		    this.indices[i + 2] = j + 2;
		    this.indices[i + 3] = j + 0;
		    this.indices[i + 4] = j + 2;
		    this.indices[i + 5] = j + 3;
		}

		this.setContext(gl);
	},

	setContext: function(gl) {
	    this.gl = gl;

	    // create a couple of buffers
	    this.vertexBuffer = gl.createBuffer();
	    this.indexBuffer = gl.createBuffer();

	    // 65535 is max index, so 65535 / 6 = 10922.

	    //upload the index data
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

	    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
	},

	begin: function(spriteBatch, renderSession) {
	    this.renderSession = renderSession;
	    this.shader = this.renderSession.shaderManager.fastShader;

	    this.matrix = spriteBatch.worldTransform.toArray(true);

	    this.start();
	},

	end: function() {
	    this.flush();
	},

	render: function(spriteBatch) {
	    var children = spriteBatch.children;
	    var sprite = children[0];

	    // if the uvs have not updated then no point rendering just yet!
	    
	    // check texture.
	    if(!sprite.texture._uvs)return;
	   
	    this.currentBaseTexture = sprite.texture.baseTexture;
	    
	    // check blend mode
	    if(sprite.blendMode !== this.renderSession.blendModeManager.currentBlendMode)
	    {
	        this.flush();
	        this.renderSession.blendModeManager.setBlendMode(sprite.blendMode);
	    }
	    
	    for(var i=0,j= children.length; i<j; i++)
	    {
	        this.renderSprite(children[i]);
	    }

	    this.flush();
	},

	renderSprite: function(sprite) {
	    if(!sprite.visible)return;
	    
	    // TODO trim??
	    if(sprite.texture.baseTexture !== this.currentBaseTexture)
	    {
	        this.flush();
	        this.currentBaseTexture = sprite.texture.baseTexture;
	        
	        if(!sprite.texture._uvs)return;
	    }

	    var uvs, vertices = this.vertices, width, height, w0, w1, h0, h1, index;

	    uvs = sprite.texture._uvs;

	    width = sprite.texture.frame.width;
	    height = sprite.texture.frame.height;

	    if (sprite.texture.trim)
	    {
	        // if the sprite is trimmed then we need to add the extra space before transforming the sprite coords..
	        var trim = sprite.texture.trim;

	        w1 = trim.x - sprite.anchor.x * trim.width;
	        w0 = w1 + sprite.texture.crop.width;

	        h1 = trim.y - sprite.anchor.y * trim.height;
	        h0 = h1 + sprite.texture.crop.height;
	    }
	    else
	    {
	        w0 = (sprite.texture.frame.width ) * (1-sprite.anchor.x);
	        w1 = (sprite.texture.frame.width ) * -sprite.anchor.x;

	        h0 = sprite.texture.frame.height * (1-sprite.anchor.y);
	        h1 = sprite.texture.frame.height * -sprite.anchor.y;
	    }

	    index = this.currentBatchSize * 4 * this.vertSize;

	    // xy
	    vertices[index++] = w1;
	    vertices[index++] = h1;

	    vertices[index++] = sprite.position.x;
	    vertices[index++] = sprite.position.y;

	    //scale
	    vertices[index++] = sprite.scale.x;
	    vertices[index++] = sprite.scale.y;

	    //rotation
	    vertices[index++] = sprite.rotation;

	    // uv
	    vertices[index++] = uvs.x0;
	    vertices[index++] = uvs.y1;
	    // color
	    vertices[index++] = sprite.alpha;
	 

	    // xy
	    vertices[index++] = w0;
	    vertices[index++] = h1;

	    vertices[index++] = sprite.position.x;
	    vertices[index++] = sprite.position.y;

	    //scale
	    vertices[index++] = sprite.scale.x;
	    vertices[index++] = sprite.scale.y;

	     //rotation
	    vertices[index++] = sprite.rotation;

	    // uv
	    vertices[index++] = uvs.x1;
	    vertices[index++] = uvs.y1;
	    // color
	    vertices[index++] = sprite.alpha;
	  

	    // xy
	    vertices[index++] = w0;
	    vertices[index++] = h0;

	    vertices[index++] = sprite.position.x;
	    vertices[index++] = sprite.position.y;

	    //scale
	    vertices[index++] = sprite.scale.x;
	    vertices[index++] = sprite.scale.y;

	     //rotation
	    vertices[index++] = sprite.rotation;

	    // uv
	    vertices[index++] = uvs.x2;
	    vertices[index++] = uvs.y2;
	    // color
	    vertices[index++] = sprite.alpha;
	 



	    // xy
	    vertices[index++] = w1;
	    vertices[index++] = h0;

	    vertices[index++] = sprite.position.x;
	    vertices[index++] = sprite.position.y;

	    //scale
	    vertices[index++] = sprite.scale.x;
	    vertices[index++] = sprite.scale.y;

	     //rotation
	    vertices[index++] = sprite.rotation;

	    // uv
	    vertices[index++] = uvs.x3;
	    vertices[index++] = uvs.y3;
	    // color
	    vertices[index++] = sprite.alpha;

	    // increment the batchs
	    this.currentBatchSize++;

	    if(this.currentBatchSize >= this.size)
	    {
	        this.flush();
	    }
	},

	flush: function() {
	    // If the batch is length 0 then return as there is nothing to draw
	    if (this.currentBatchSize===0)return;

	    var gl = this.gl;
	    
	    // bind the current texture

	    if(!this.currentBaseTexture._glTextures[gl.id])this.renderSession.renderer.updateTexture(this.currentBaseTexture, gl);

	    gl.bindTexture(gl.TEXTURE_2D, this.currentBaseTexture._glTextures[gl.id]);

	    // upload the verts to the buffer
	   
	    if(this.currentBatchSize > ( this.size * 0.5 ) )
	    {
	        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
	    }
	    else
	    {
	        var view = this.vertices.subarray(0, this.currentBatchSize * 4 * this.vertSize);

	        gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
	    }
	    
	    // now draw those suckas!
	    gl.drawElements(gl.TRIANGLES, this.currentBatchSize * 6, gl.UNSIGNED_SHORT, 0);
	   
	    // then reset the batch!
	    this.currentBatchSize = 0;

	    // increment the draw count
	    this.renderSession.drawCount++;
	},

	stop: function() {
	    this.flush();
	},

	start: function() {
	    var gl = this.gl;

	    // bind the main texture
	    gl.activeTexture(gl.TEXTURE0);

	    // bind the buffers
	    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

	    // set the projection
	    var projection = this.renderSession.projection;
	    gl.uniform2f(this.shader.projectionVector, projection.x, projection.y);

	    // set the matrix
	    gl.uniformMatrix3fv(this.shader.uMatrix, false, this.matrix);

	    // set the pointers
	    var stride =  this.vertSize * 4;

	    gl.vertexAttribPointer(this.shader.aVertexPosition, 2, gl.FLOAT, false, stride, 0);
	    gl.vertexAttribPointer(this.shader.aPositionCoord, 2, gl.FLOAT, false, stride, 2 * 4);
	    gl.vertexAttribPointer(this.shader.aScale, 2, gl.FLOAT, false, stride, 4 * 4);
	    gl.vertexAttribPointer(this.shader.aRotation, 1, gl.FLOAT, false, stride, 6 * 4);
	    gl.vertexAttribPointer(this.shader.aTextureCoord, 2, gl.FLOAT, false, stride, 7 * 4);
	    gl.vertexAttribPointer(this.shader.colorAttribute, 1, gl.FLOAT, false, stride, 9 * 4);
	}
});

});
