/* 
    SFZ to HISE - translator application / converter
    > Written by Anders Eklöv and licensed under the MIT open source license.
    > Client-side vanilla Javascript, no frameworks used and made with compatibility in mind.
    > Contact: twitter.com/anderseklov or https://keypleezer.com/support/contact-us/ 
    > Use in downloaded version in any modern web browser, or on:
    >> https://keypleezer.com/sfz-to-hise-converter/
*/


// function that processes a header (region, control, global etc) when next header is reached. It will process all data since last header. 

function processHeader (data_to_process) {


	const incoming_data = data_to_process;  
	const headerTypeToProcess = current_header_type; // set the header type to process, previously set in the header-sift-for-loop

	var acc_msg = ""; // accumulated log message used when debug = true (or ticked on front-end ui)
	
	// currently unsupported just return "unsupported" to main funciton initiator.
	if ( headerTypeToProcess == '<curve>'  ) { return "unsupported"; }
	if ( headerTypeToProcess == '<effect>' ) { return "unsupported"; }
	if ( headerTypeToProcess == '<master>' ) { return "unsupported"; }
	if ( headerTypeToProcess == '<midi>'   ) { return "unsupported"; }
	if ( headerTypeToProcess == '<sample>' ) { return "unsupported"; }


	var runSampleChecks = false; // declares for main vars.
	var the_opc;
	var the_value;
	var this_line;
	var dest;


	// Initialize and increment header parameters 
	// ------------------------------------------

	if (headerTypeToProcess == '<control>') { 
		dest = "control";
		/* debug */ if (debug) acc_msg += "\n[processing <control> header] ";
	}
	if (headerTypeToProcess == '<global>') { 
		dest = "global"; 
		/* debug */ if (debug) acc_msg += "\n[processing <global> header] ";
	}

	if (headerTypeToProcess == '<group>') {

		current_group += 1;
		runSampleChecks = true;
		dest = "group";

		/* debug */ if (debug) acc_msg += "\n[processing <group> header]\n>> current_group_id: " + current_group;

	}

	if (headerTypeToProcess == '<region>') {

		current_region_id += 1; // increment sample id number, also acting as key in the output object.
		runSampleChecks = true;
		dest = "region";
	      
    	if ( extendedOpcodesOutput.region.basic[current_region_id] == undefined ) {
			extendedOpcodesOutput.region.basic[current_region_id] = {}; // create empty region object, initializing region id.
		}
		if ( extendedOpcodesOutput.region.extended[current_region_id] == undefined ) {
			extendedOpcodesOutput.region.extended[current_region_id] = {}; // create empty region object, initializing region id.
		}


		if (current_group < 0) { current_group = 0; } // set group-less documents to use group 1 (id 0).

		/* debug */ if (debug) acc_msg += "\n\n[processing <region> header]\n>> current_region_id: " + current_region_id;

	}

	if (dest == "group" || dest == "region") {
		if ( extendedOpcodesOutput.group.basic[current_group] == undefined ) {
			extendedOpcodesOutput.group.basic[current_group] = {}; // create empty region object, initializing group id.
		}
		if ( extendedOpcodesOutput.group.extended[current_group] == undefined ) {
			extendedOpcodesOutput.group.extended[current_group] = {}; // create empty region object, initializing group id.
		}
	}


	// FOR EACH LINE, RUN EXEC REGEXES IN WHILE LOOPS LOOKING FOR ALL TOKENS AND SFZ STUFF.
  	for (var item = 0; item < incoming_data.length; item++) {
  
  		this_line = incoming_data[item];

		var multiple_matches_main = []; // array for storing the matches in sub-arrays.
		var z = 0;
		var counter = 0;

		// FIND opcodes and their values - store it in multiple_matches_main array. (all except 'sample' opcode)
		while(null != (z=regex_all_tokens.exec(this_line))) { 
			multiple_matches_main.push(z); // push the match onto the main opcodes collector array.
			counter++;
		}


		// for each potential multi-word opcode (like group_label, global_label), find and replace the string.
		for (let i = 0; i < potential_multi_word_opcodes.length; i++) {
			for (let j = 0; j < multiple_matches_main.length; j++) {

				if (multiple_matches_main[j][2] == potential_multi_word_opcodes[i]) {

					// regexes to find multiple worded *_label values, which will be missed by the main opcode search
					let multi_word_regex = RegExp('((' + potential_multi_word_opcodes[i] + ')(?:[=]{1})([a-zA-Z0-9$_\\- \\t]{1,})([ ]{1}[a-zA-Z0-9$_\\-]{1,}[=]{1}))');
					let multi_word_regex_endline = RegExp('((' + potential_multi_word_opcodes[i] + ')(?:[=]{1})([a-zA-Z0-9$_\\- \\t]{1,}))');

					// overwrite value in multiple_matches_main with the full string found for global_label, group_label or master_label
					if (null != (z = multi_word_regex.exec(this_line))) {
						multiple_matches_main[j][3] = z[3]; // overwrite incomplete string with new match.
					} else if (null != (z = multi_word_regex_endline.exec(this_line))) {
						multiple_matches_main[j][3] = z[3]; // same, for if the opcode was found at the end of the line.
					}

					/* debug */ if (debug) acc_msg += "\n>> multi-word opcode processed: " + potential_multi_word_opcodes[i];

				}
 
			}
		}
		

		// if we are dealing with either groups or regions, we look for samples, specified above.
		if ( runSampleChecks ) { 

			// look for matches to 'samples' and push to specific matches array for sample opcode only. 
			var multiple_matches_samples = [];
			counter = 0;
			z = 0;

			while(null != (z=regex_sample_only.exec(this_line))) { 
				multiple_matches_samples.push(z); // push the match onto the sample opcodes collector array.				
				counter++;
			}

			/* debug */ if (debug) acc_msg += "\n>> runSampleChecks found " + counter + " matches.";


	        if (multiple_matches_samples.length > 0) { // this if patches an issue where the multiple_matches_samples on some lines was deleted by a non match above.

	        	// using first sample match, fill new object for subsequent entry into extendedOpcodesObject for region or group.
	        	const predefined_sample_keys = { 
            		sample: multiple_matches_samples[0][4] + "." + multiple_matches_samples[0][5].toLowerCase(),
                	path: multiple_matches_samples[0][3]
                }; 

				if (dest == "region") { // check for region samples
					
					extendedOpcodesOutput.region.basic[current_region_id] = predefined_sample_keys;
	            
	            } else if (dest == "group") { // groups can have samples too, that are used for a whole group.
					
					extendedOpcodesOutput.group.basic[current_group].group_sample = predefined_sample_keys; 
	            
	            }

			}


 		} // end if runSampleChecks (for both region and group headers)

		
        // after regex matches collection we run the analysis of opcodes and values from the capture arrays
        // and insertion of data into the literal object.

        for (z = 0; z < multiple_matches_main.length; z++) {

        	the_opc = multiple_matches_main[z][2]; // reaching for the opcode name here. For all except "sample" opcodes here.
        	
        	if (the_opc == "sample") { continue; } // this has already been extracted above.

        	the_value = multiple_matches_main[z][3]; // and the value.
        	

	    	if ( supportedSfzOpcodes.includes(the_opc) ) { // check if the opcode is supported by hise. 
	        
	            /* debug */ if (debug) acc_msg += "\n>> >> Opcode '" + the_opc + "' (supported) filed under extendedOpcodesOutput.region.basic.[region_id / group_id / header type]." + the_opc;
	            opcodes_type = "basic";
	        
	        } else { 
	        
	        	/* debug */ if (debug) acc_msg += "\n>> >> Opcode '" + the_opc + "' (unsupported) filed under extendedOpcodesOutput.region.extended.[region_id / group_id / header type]." + the_opc;
	        	opcodes_type = "extended";
	        
	        }


	        if (dest) {


	        	if ( extendedOpcodesOutput[dest][opcodes_type] == undefined ) {
					extendedOpcodesOutput[dest][opcodes_type] = {}; // create empty region object.
				}

	        	// enter the opcode and value in the proper place in the extendedOpcodesOutput object structure.
	        
		        if (dest == "global") { // <global> opcodes entry.
			        extendedOpcodesOutput.global[opcodes_type][the_opc] = the_value;
	            }

	            if (dest == "control") { // <control> opcodes entry.
			        extendedOpcodesOutput.control[opcodes_type][the_opc] = the_value;
	            }

	            if (dest == "group") { // <group> opcodes entry.

	            	if ( extendedOpcodesOutput.group[opcodes_type][current_group] == undefined ) {
						extendedOpcodesOutput.group[opcodes_type][current_group] = {}; // create empty region object.
					}
			        extendedOpcodesOutput.group[opcodes_type][current_group][the_opc] = the_value;

	            }

	            if (dest == "region") { // <region> opcodes entry.
			        extendedOpcodesOutput.region[opcodes_type][current_region_id][the_opc] = the_value;
		        }

	        }
	        
	        

        } // end for multiple_matches_main loop.

        
        if (dest == "region") {

        	extendedOpcodesOutput.region.basic[current_region_id]["gr_id"] = current_group; // extra for regions - add group id.
        	extendedOpcodesOutput.region.basic[current_region_id]["region_id"] = current_region_id; // extra for regions - the region id as in the loop number.
        	extendedOpcodesOutput.region.extended[current_region_id]["gr_id"] = current_group;
        	extendedOpcodesOutput.region.extended[current_region_id]["region_id"] = current_region_id;

        }

	  	
	} // END FOR LOOP OF ALL LINES IN FUNCTION.


	/* debug */ if (debug) console.log(acc_msg); // the accumulated messages througout the looping of this header.

	return 1;
  
} // end function processItem.
