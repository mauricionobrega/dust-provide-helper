'use strict';

module.exports = registerWith;
module.exports.registerWith = registerWith;

function registerWith(dust) {
	dust.helpers.provide = provideHelper;
}

function provideHelper(chunk, context, bodies, params) {
	// Apply params to the local context if needed
	var localContext = context;
	if (params) {
		localContext = context.push(params);
	}

	// Create a new chunk (blank workspace)
	return chunk.map(function render(branch) {
		// Save the initial neighbor (allows to extract rendered variables)
		var next = branch.next;

		// Make the initial chunk unflushable, so that the rendered variables
		// can be intercepted
		chunk.flushable = false;

		// Render all variable bodies, and store the resulting values
		var values = {};
		for (var key in bodies) {
			if (key !== 'block') {
				var data = getData(bodies[key]);
				try {
					values[key] = JSON.parse(data);
				} catch (error) {
					values[key] = data;
				}
			}
		}

		// Make the initial chunk flushable again, so that the main body can
		// be rendered correctly
		chunk.flushable = true;

		// Render the main body, with rendered variables injected into its
		// local context
		branch.render(bodies.block, localContext.push(values)).end();

		// Render the given body, but return the generated content instead of
		// writing it to the output
		function getData(body) {
			// Render the given body
			branch.render(body, localContext);

			// Walk through the generated content, and gather output data
			var chunk = branch;
			var data = [];

			while (chunk !== next) {
				data.push.apply(data, chunk.data);
				chunk = chunk.next;
			}

			// Remove the generated content from the output
			branch.data = [];
			branch.next = next;

			// Return the extracted data
			return data.join('');
		}
	});
}
