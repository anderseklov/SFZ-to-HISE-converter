/* 
    SFZ to HISE - translator application / converter
    > Written by Anders Eklöv and licensed under the MIT open source license.
    > Client-side vanilla Javascript, no frameworks used and made with compatibility in mind.
    > Contact: twitter.com/anderseklov or https://keypleezer.com/support/contact-us/ 
    > Use in downloaded version in any modern web browser, or on:
    >> https://keypleezer.com/sfz-to-hise-converter/
    > version 0.5.2
*/

// string replacements before running main format translation and SFZ opcode searches.

function preStringReplacements() {

	if (sfzFileData == undefined || sfzFileData == "") {
        return { error: "Error in the input file data, not present or not loaded. Please load a file." };
    }

    var log = ""; // for one concatenated console log message. 

	for (var i = 0; i < split_lines.length; i++) { // simple form testing
	
		let this_line = split_lines[i];
		let back_slashes = this_line.replace(/\\{1,}/g, "/"); // turn any "\" into a "/"
		let line_output = back_slashes;
		var sample_match = line_output.match(/sample=.{1,}\./);

		if (sample_match) {

			// first match on line of "sample= ... ." is now washed clean of unsupported characters.
			let match_phrase = sample_match[0]; 

			/* debug */ if (debug) log += "\n[[ NEW FILE ]]\n** original sample path: " + match_phrase;

			let replace_chars = match_phrase.replace(/\/{2,}/g, "/"); // all double "//" made into single "/"
			replace_chars = replace_chars.replace(/\=\/{1,}/, "="); // remove first occurrence of "/", any amount.
			replace_chars = replace_chars.replace(/sample=[a-zA-Z]\:{1,}\/*/, "sample="); // remove "C:" or any letter, and trailing "/"s.

			/* debug */ if (debug) log += "\n** removed unsupported characters: " + replace_chars;

			// now user input vars for beginning of samples paths - append to latest vars.

			let user_prefix = "";

			if (sPrefix_sw.checked && sPrefix.value.length > 0) { 

				user_prefix = replace_chars.replace(/sample=/, "sample=" + sPrefix.value);
				replace_chars = user_prefix;
				/* debug */ if (debug) log += "\n** user sample path prefixed: " + user_prefix;
			}

			line_output = line_output.replace(match_phrase, replace_chars); // replace the original sample string with the modified.
			
			/* debug */ if (debug) log += "\n** > Modified output: " + line_output;

		} 

		// overwrite array input with the new modified string, mutating it intentionally.
		split_lines[i] = line_output;
	
	}

	return log; // return the log messages for the 
}
