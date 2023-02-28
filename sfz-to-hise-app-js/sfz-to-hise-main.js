/* 
    SFZ to HISE - translator application / converter
    > Written by Anders Eklöv and licensed under the MIT open source license.
    > Client-side vanilla Javascript, no frameworks used and made with compatibility in mind.
    > Contact: twitter.com/anderseklov or https://keypleezer.com/support/contact-us/ 
    > Use in downloaded version in any modern web browser, or on:
    >> https://keypleezer.com/sfz-to-hise-converter/
    > version 0.5.2
*/


// initial global variables used throughout application.

var line_contents;
var headerType;
var sfzFileData; // main var to store all read files data into.
var split_lines; // array from imported file contents, used in all processing.

var outputPreSfz = document.getElementById('outputFileReadData'); // has to be redeclared outside of previous function.
var outputPre = document.getElementById('outputHiseMap'); // has to be redeclared outside of previous function.
const statsOutput = document.getElementById('stats_statsOutput');
var amountOfLines;

var debug = false; // false by default, set by condition for every sfz run.

// user settings HTML input references
var sDebug_sw = document.getElementById('s_debug_sw');
var sMapName = document.getElementById('setting_inputMapName');
var sPrefix_sw = document.getElementById("s_samplesPrefix_sw");
var sPrefix = document.getElementById("s_samplesPrefix");
var sGroupSeqPosition_sw = document.getElementById("s_samplesSequencePosition_sw");
var s_defaultNoValue_radioGr = null; // this ui setting is checked every time a conversion is run.
var sArraysInsteadOfObjects_sw = document.getElementById("s_arraysInsteadOfObjects_sw"); // front-end tick-box for using array or object-keys for regions.
var arraysInsteadOfObjects = null; // front-end tick-box for using array or object-keys for regions.


var hiseMapOutput_clipboard = ""; // used to copy HISE output samplemap to clipboard, saved at every run inside fromObjToHiseMap function.
var extendedOpcodesOutput_clipboard = ""; // same but stringified JSON for extended opcodes data object, for copy to clipboard on ui.

/*  --------------------------------------------------------  
    FILE READER - input from reading SFZ file (.sfz or .txt)
    --------------------------------------------------------  */

// event listener - from file reader input field in webpage form.
document.getElementById('inputfile').addEventListener('change', function() {

    var fr = new FileReader();
    fr.onload = function() {

        sfzFileData = fr.result; // catch file contents of chosen file.
        splitLines(); // split data into an array for use in application.
        outputPreSfz.innerText = sfzFileData; // output file contents to the HTML view div/input for preview before conversion.

        // stats messages, feedback for user upon file load.
        statsOutput.innerText += "-> SFZ file loaded: '" + fr.sfzToHise_fileName + "'";

    };

    fr.readAsText(this.files[0]); // to view all parts of the fr (the new FileReader(), just type console.log(fr), to see all parts of it.    
    fr.sfzToHise_fileName = this.files[0].name; // custom FileReader() file name key, added here manually, but not normally in this object prototype.

});

// splits the latest loaded FileReader() data to an array, each time, deleting/flushing latest run.
function splitLines() {
    split_lines = []; // flush/delete previous run, ensuring latest data import.
    split_lines = sfzFileData.split("\n"); // split the SFZ data into lines using new line character.
}


// UI frontend - copy anything to clipboard
function copyToClipBoard(item, item_name) {
    navigator.clipboard.writeText(item);
    console.log("[ clipboard action: " + item_name + " output: ]"); // also output the copied strings to the console.
    console.log(item);
    statsOutput.innerText += "\n* " + item_name + " copied to clipboard.";
}

// UI frontend - copy anything to clipboard inside a var x = the_thing; statement for easy copy-paste.
function copyToClipBoardInVar(item, item_name, var_name, var_type) {
    let itemInVar = var_type + " " + var_name + " = " + item + ";";
    copyToClipBoard(itemInVar, item_name); // use main clipboard function with amendments.
}



// globally declared variables. 
// -----------------------------

var type; // default for the type of thing we're working on.
var checkType;

var current_header_type;
var current_header_data = [];
var processIt;
var log_concat;
var current_region_id = -1;
var current_group = -1;



// initialize all SFZ and HISE opcodes arrays and objects
// ------------------------------------------------------

const headersArray = ["control", "global", "group", "region", "curve", "effect", "master", "midi", "sample"];

// supported hise opcodes in order of relevance/usability here.
const supportedSfzOpcodes = [
    "sample", 
    "key", 
    "pitch_keycenter", 
    "lokey", 
    "hikey", 
    "lovel", 
    "hivel", 
    "tune", 
    "volume", 
    "group_volume", 
    "pan", 
    "group_label", 
    "offset", 
    "end", 
    "loop_mode", 
    "loopmode", 
    "loop_start",
    "loopstart", 
    "loop_end", 
    "loopend",
    "seq_length",  // for global and group
    "seq_position" // for regions
    // not used in analysis: "lorand", "hirand", "seq_length", "seq_position", soon perhaps.
    // not used in analysis: "global_label", "master_label" 
];


// The array "supportedSfzOpcodes" (the active parts) is this application's current supported SFZ Opcodes to 
// be used in rendering of HISE samplemaps. Used in the search for supported opcodes, later entered into the main
// collection object (JS object literal) called "extendedOpcodesOutput".

// The array "hiseTags" contains sub-arrays for each HISE tag/property and a adjacent SFZ opcode name. 
// If there are aliases for a SFZ opcode, such as loopmode for loop_mode, they are both referenced in a sub-array.

const hiseTags = [
    /*[0]*/  ["FileName", "sample"],
    /*[1]*/  ["Root", ["key", "pitch_keycenter"]], /* root has multiple potential matches, so a sub-sub-array. If you find more, just add it in a similar sub-array for each value to extend the parser. */
    /*[2]*/  ["LoKey", "lokey"],
    /*[3]*/  ["HiKey", "hikey"],
    /*[4]*/  ["LoVel", "lovel"],
    /*[5]*/  ["HiVel", "hivel"],
    /*[6]*/  ["Volume", "volume"],              /* group_volume can be accessed via the extendedOpcodesOutput.group -> group_volume key, if opcode is present */
    /*[7]*/  ["Pan", "pan"], 
    /*[8]*/  ["Pitch", "tune"], 
    /*[9]*/  ["SampleStart", "offset"],
    /*[10]*/ ["SampleEnd", "end"],
    /*[11]*/ ["LoopEnabled", ["loop_mode", "loopmode"]],
    /*[12]*/ ["LoopStart", ["loop_start", "loopstart"]],
    /*[13]*/ ["LoopEnd", ["loop_end", "loopend"]],
    /*[14]*/ ["LoopXFade", null], 
    /*[15]*/ ["SampleStartMod", null]
];

// some opcodes that may contain multiple words and will not be caught by the generic opcode-regex.
const potential_multi_word_opcodes = ["group_label", "global_label", "master_label"];

// current excluded HISE properties, until tested. 
const currentExclusions = ["LoopEnabled", "LoopXFade", "SampleStartMod", "LoopEnd", "LoopStart", "SampleStart", "SampleEnd"];



// headers object with switches for activating what header is being processed.
var isHeaderType = {
    "<control>":0,
    "<global>":0,
    "<group>":0,
    "<region>":0,
    "<curve>":0,
    "<effect>":0,
    "<master>":0, // ARIA extension
    "<midi>":0, // ARIA extension
    "<sample>":0 // cakewalk version of "region", ignored in this script.
};

var extendedOpcodesOutput = {}; // declare object for storing opcodes and token info from SFZ files and output in log later.



// midi note names as keys, values in numbers, for fastest name-to-number convert on key/pitch_keycenter, 
// obj literal form, one line for each octave, all-caps converted.
const midi_note_names_to_nrs = { 
   "C-2": "0", "DB-2": "1", "D-2": "2", "EB-2": "3", "E-2": "4", "F-2": "5", "GB-2": "6", "G-2": "7", "AB-2": "8", "A-2": "9", "BB-2": "10", "B-2": "11", 
   "C-1": "12", "DB-1": "13", "D-1": "14", "EB-1": "15", "E-1": "16", "F-1": "17", "GB-1": "18", "G-1": "19", "AB-1": "20", "A-1": "21", "BB-1": "22", "B-1": "23", 
   "C0": "24", "DB0": "25", "D0": "26", "EB0": "27", "E0": "28", "F0": "29", "GB0": "30", "G0": "31", "AB0": "32", "A0": "33", "BB0": "34", "B0": "35", 
   "C1": "36", "DB1": "37", "D1": "38", "EB1": "39", "E1": "40", "F1": "41", "GB1": "42", "G1": "43", "AB1": "44", "A1": "45", "BB1": "46", "B1": "47", 
   "C2": "48", "DB2": "49", "D2": "50", "EB2": "51", "E2": "52", "F2": "53", "GB2": "54", "G2": "55", "AB2": "56", "A2": "57", "BB2": "58", "B2": "59", 
   "C3": "60", "DB3": "61", "D3": "62", "EB3": "63", "E3": "64", "F3": "65", "GB3": "66", "G3": "67", "AB3": "68", "A3": "69", "BB3": "70", "B3": "71", 
   "C4": "72", "DB4": "73", "D4": "74", "EB4": "75", "E4": "76", "F4": "77", "GB4": "78", "G4": "79", "AB4": "80", "A4": "81", "BB4": "82", "B4": "83", 
   "C5": "84", "DB5": "85", "D5": "86", "EB5": "87", "E5": "88", "F5": "89", "GB5": "90", "G5": "91", "AB5": "92", "A5": "93", "BB5": "94", "B5": "95", 
   "C6": "96", "DB6": "97", "D6": "98", "EB6": "99", "E6": "100", "F6": "101", "GB6": "102", "G6": "103", "AB6": "104", "A6": "105", "BB6": "106", "B6": "107", 
   "C7": "108", "DB7": "109", "D7": "110", "EB7": "111", "E7": "112", "F7": "113", "GB7": "114", "G7": "115", "AB7": "116", "A7": "117", "BB7": "118", "B7": "119", 
   "C8": "120", "DB8": "121", "D8": "122", "EB8": "123", "E8": "124", "F8": "125", "GB8": "126", "G8": "127"
};



// REGEX OBJECT - object literal containing main regex expressions used, all "\" (escaped).
const oRegx = {

    spaces_or_tabs: "([ \\t]\{1,\})", // any amount of spaces or tabs (at least one). 
    spaces_tabs_opt: "(?:[ \\t]{1,})?", // any amount of spaces or tabs (at least one). 
    comment_line: "^([ [\\t]{1,})?(//){1}.*", // regex for only comment on a line. Can include spaces or tabs.
    nrs_float_1: "([+-]?(\\d+)(\\.\\d+)?)" // not including this as a regex group on its own, do that later.

};

const reg_exe_space_only = RegExp("^" + oRegx.spaces_or_tabs + "$"); // RegExp() for only space on a line.

// MAIN REGEX USED IN SEARCHES ON EACH LINE
const regex_all_tokens = RegExp('((?:[ \t]{1,})?([a-zA-Z0-9$_-]{1,})(?:[=]{1})([a-zA-Z0-9\.$_-]{1,})(?:[ \t]{1,})?)', 'g');
    
    // regex capture groups for all main tokens:
        // 1: whole
        // 2: token
        // 3: value

        // ((?:[ \t]{1,})?([a-zA-Z0-9$_-]{1,})(?:[=]{1})(([a-zA-Z0-9$_-]{1,})([ ]*)?){1,})


// SAMPLE ONLY REGEX
const regex_sample_only = RegExp('((?:[ \t]{1,})?(sample{1})(?:={1})(.*\/{1,})?(.{1,})\.(wav|WAV|aiff|AIFF|aif|AIF|flac|FLAC){1}(?:[ \t]{1,})?)', 'g');

    // regex capture groups for sample-tokens:
        // 1: whole
        // 2: token, in this case always "sample"
        // 3: path (optional)
        // 4: value, filename without extension. 
        // 5: extension only, no dot.



// PROGRESS BAR JS FUNCTION - Based on lines in document input.
const barElement = document.getElementById("theBar");
const percentFeedback = document.getElementById("percentage_feedback");
var barW = 0;
var totL;

function progressBar(line_id) {
    
    if (amountOfLines) { totL = amountOfLines; } else { totL = 100; }
    barW = ( (100/totL) * (line_id + 1) );
    barElement.style.width = barW + "%";
    percentFeedback.innerText = barW + "%";

}


function resetExtendedOpcodesObject() {

    extendedOpcodesOutput = {}; // reset to empty object

    // activate and poplulate object keys.
    for (var h = 0; h < headersArray.length; h++) {

        var hd = headersArray[h];
        extendedOpcodesOutput["" + hd + ""] = {}; // create one sub-object for each handled header type. 

        // currently supported headers
            // refactor <region> and <group> soon, needs region.region_id.basic/extended instead, also groups need extra region lists, copied from region list. 

        if (hd == "region") {

            if (arraysInsteadOfObjects) {
                extendedOpcodesOutput["" + hd + ""]["basic"] = []; // for hise compatible values
                extendedOpcodesOutput["" + hd + ""]["extended"] = []; // every other region parameter.
            } else {
                extendedOpcodesOutput["" + hd + ""]["basic"] = {}; // for hise compatible values
                extendedOpcodesOutput["" + hd + ""]["extended"] = {}; // every other region parameter.
            }
            
        }

        if (hd == "group" || hd == "global" || hd == "control") {

            extendedOpcodesOutput["" + hd + ""]["basic"] = {}; // for hise compatible values
            extendedOpcodesOutput["" + hd + ""]["extended"] = {}; // every other region parameter.

        }
        
        if (hd == "control") {
            extendedOpcodesOutput["" + hd + ""].extended["#define"] = {}; // #define opcode defines variables, here accessed by object key-value pairs.
        }

        // not supported yet.
        if (hd == "effect" || hd == "master" || hd == "midi" || hd == "curve" || hd == "sample") {
            extendedOpcodesOutput["" + hd + ""] = "CURRENTLY UNSUPPORTED";
        } 
      
    }

}

// run once, initializing extendedOpcodesOutput object.
resetExtendedOpcodesObject();


// assertains the HISE properties Root, HiKey and LoKey for one sample.
function assertKeyRangeAndRoot(group_id, region_id) {

    // key, pitch_keycenter, lo_key, hi_key - region, group, global, control, else over to next logic

    let region  = extendedOpcodesOutput.region.basic[region_id];
    let group   = extendedOpcodesOutput.group.basic[group_id];
    let globalH = extendedOpcodesOutput.global.basic;

    // search header hirearchy for root, lokey, hikey.
    let region_root = (region.key) ? region.key 
    : (region.pitch_keycenter) ? region.pitch_keycenter 
    : (group.key) ? group.key 
    : (group.pitch_keycenter) ? group.pitch_keycenter 
    : (globalH.key) ? globalH.key 
    : (globalH.pitch_keycenter) ? globalH.pitch_keycenter : undefined;

    let region_lokey = (region.lokey) ? region.lokey 
    : (group.lokey) ? group.lokey 
    : (globalH.lokey) ? globalH.lokey : undefined;

    let region_hikey = (region.hikey) ? region.hikey 
    : (group.hikey) ? group.hikey 
    : (globalH.hikey) ? globalH.hikey : undefined;


    // now get nr from letter, aka "22" from c2, or alike
    // typeof region_lokey != "number" can be used to view if it is a number, currently not used.
    
    if ( region_root && isNaN(parseInt(region_root)) ) { 
        let noteNr = midi_note_names_to_nrs[region_root.toUpperCase()];
        region_root = noteNr;
    }
    if ( region_lokey && isNaN(parseInt(region_lokey)) ) { 
        let noteNr = midi_note_names_to_nrs[region_lokey.toUpperCase()];
        region_lokey = noteNr;
    }
    if ( region_hikey && isNaN(parseInt(region_hikey)) ) { 
        let noteNr = midi_note_names_to_nrs[region_hikey.toUpperCase()];
        region_hikey = noteNr;
    }

    let lo;
    let hi;
    let root;

    if (!region_root) {  // if root is not set, calculate root and/or set hi/lo keys.

        if (region_lokey && region_hikey) {
            
            lo = parseInt(region_lokey);
            hi = parseInt(region_hikey);
             
            let diff = hi - lo;
            let flooredHalf = Math.floor(diff / 2);
            let middle = ( (diff - flooredHalf) == (flooredHalf + 1) ) ? true : false;

            // if equal, if middle is a clean number, if not: below middle integer, else hi key
            root = (lo === hi) ? lo 
            : (middle) ? lo + flooredHalf + 1
            : (lo < hi) ? lo + flooredHalf
            : hi;

        } else {

            root = (region_lokey) ? region_lokey : (region_hikey) ? region_hikey : "";
            lo   = (region_lokey) ? region_lokey : (region_hikey) ? region_hikey : "";
            hi   = (region_hikey) ? region_hikey : (region_lokey) ? region_lokey : "";
        
        }

    } else {  // root key is defined

        root = region_root;

        // if root is set, now set hi/lo keys based on availability.
        lo = (region_lokey) ? region_lokey : (region_hikey) ? Math.min(parseInt(region_root), parseInt(region_hikey)) : region_root;
        hi = (region_hikey) ? region_hikey : (region_lokey) ? Math.max(parseInt(region_root) , parseInt(region_lokey)) : region_root;

    }

    return { root_k: root, lo_k: lo, hi_k: hi }; // return as object
}





// function to assertain LoVel and HiVel for one sample throughout header hirearchy.
function assertVelRange(group_id, region_id) {

    let region  = extendedOpcodesOutput.region.basic[region_id];
    let group   = extendedOpcodesOutput.group.basic[group_id];
    let globalH = extendedOpcodesOutput.global.basic;

    const lo = (region.lovel) ? region.lovel 
    : (group.lovel) ? group.lovel 
    : (globalH.lovel) ? globalH.lovel : "0";

    const hi = (region.hivel) ? region.hivel 
    : (group.hivel) ? group.hivel 
    : (globalH.hivel) ? globalH.hivel : "127";

    return { lo_v: lo, hi_v: hi }; // return as object
}



// function to assertain LoVel and HiVel for one sample throughout header hirearchy.
function assertHiseTagValue(group_id, region_id, hise_tag, has_sfz_alias) {


    // not used yet... 

    let region  = extendedOpcodesOutput.region.basic[region_id];
    let group   = extendedOpcodesOutput.group.basic[group_id];
    let globalH = extendedOpcodesOutput.global.basic;

    const lo = (region.lovel) ? region.lovel 
    : (group.lovel) ? group.lovel 
    : (globalH.lovel) ? globalH.lovel : "0";


    return { lo_v: lo, hi_v: hi }; // return as object
}




// MAIN LINE ITERATOR FUNCTION - reads all lines and decides what to do.
// ---------------------------------------------------------------------

function processSfzReadFunc() {

    const lastLine = split_lines.length - 1; // last iteration id of the loaded sfz doc. 
    amountOfLines = split_lines.length;
        statsOutput.innerText += "\n-> SFZ conversion started... (" + amountOfLines + " text lines) ";
    var input;

    var firstHeaderReached = false;
    var firstHeader = false;

    current_group = -1; // reset these, used in opcode-processing (procesIt function)
    current_region_id = -1; 



    // begin processing - line by line

    for (var i = 0; i < split_lines.length; i++) {
      
        // set basics:
        line_contents = split_lines[i];

        log_concat = ""; // just empty this for every line.
        progressBar(i);

        var lastButNothing = false; // used to avoid missing last line potential headers or instructions

        /* debug */ if (debug) log_concat += "> [ current line: " + i + " ] ";

        // basic stuff to skip for all lines. 
        if ( line_contents == "" || reg_exe_space_only.test(line_contents) ) { // only space or tabs. 

            /* debug */ if (debug) log_concat += "-- (spaces only)";
               
            if ( i != lastLine ) { 
                continue;  // if empty or space-only, skip to next line if not last line. 
            } else { 
                lastButNothing = true;
            } 

        } else if ( RegExp(oRegx.comment_line).test(line_contents) ) { // only commment

            /* debug */ if (debug) log_concat += "-- (comment only)";
            if ( i != lastLine ) { continue; } else { lastButNothing = true; } // continue to next line only if not last line. 

        } 
      
      
        // resets for every line checked.
        type = "none"; // default for the type of thing we´re working on.


        if (lastButNothing !== true) { // run only if you dont find either spaces only or comments only.


            /* debug */ if (debug) log_concat += " CONTENTS: [[" + line_contents + "]] ";

            // check if the line is a header line.
            for ( headerType in isHeaderType ) {

                // look for one instance of any header-type, preceded by optional space, followed by any characters.
                checkType = line_contents.match( RegExp('^' + oRegx.spaces_tabs_opt + headerType + '{1}.*') ); 

                if ( checkType != null && checkType != undefined ) {

                    /* debug */ if (debug) log_concat += " found headerType = '" + headerType + "'";
                    type = "is_header"; // just made sure we got a header on this line. 

                    next_header_type = headerType; // set this line´s header type, up next.

                    if ( !firstHeaderReached ) { // also flip to true, saying that we ofund the first header.

                        firstHeaderReached = true;
                        firstHeader = true;
                        current_header_type = next_header_type; // just set to next, if not defined.

                    } else { 

                        firstHeader = false; // this is just a flip switch to only be done for the first ever header found.

                    } // else set it back to false. 
                  
                } 

            } // end for header check.
          

          
            // now process the lines
            ////////////////////////////////////////
            if ( type == 'is_header' ) {    // This specific line has a <header> match. If a line is does not include a <header>, 
                                            // it could include opcodes for it. In that case this is handled in the else statement.

                if ( firstHeader ) { // array is not filled yet, at first header, so no real processing, just entering.

                    current_header_data.push(line_contents); // just push current line onto array for processing next time a header is reached.                  
                  
                } else { // since it was not the first header, we now do the full processing.

                    /* debug */ if (debug) log_concat += "\n> LINE " + i + " found next_header_type: " + next_header_type + ".  Now running current_header_type: " + current_header_type;

                    input = current_header_data;

                    // running the collected header data through the header processing function  
                    processIt = processHeader(input); 

                    /* debug */
                    if (debug) {
                        let processMsg = (processIt === 1) ? "\n** header processed successfully! " : (processIt == "unsupported") ? "\n** unsupported header! " : "\n** !! processing of header failed !!";
                        log_concat += processMsg;
                    }

                    // reset transfer data and begin current line handling.

                    isHeaderType[current_header_type] = 0; // set the previous, the just processed, header to 0.
                    isHeaderType[next_header_type] = 1; // set the NEW next header to 1.
                    current_header_type = next_header_type; // set the header found in the above for loop for this line.
                    current_header_data = []; // empty the array of header data.
                    current_header_data.push(line_contents); // just push this current line onto the same array for processing next time.

                } // end if first header check.




            } else { // means this line is not itself a header declaration, but may still contain info from last one. 


                if ( firstHeaderReached ) { // only if we reached a header, any.
                    current_header_data.push(line_contents); // now push data to a new line in collector, later processed.
                } else { 
                    /* debug */ if (debug) log_concat += "\n> LINE " + i + " - first header was NOT reached. ";
                }


            } // if 'is_header'


        // ----------------------------------
        } // END IF lastButNothing is not true
        // all above runs only if we are not on the last line and nothing was on it.



        // now finally, if we found nothing on the line and it was the last line.
        if ( i == lastLine ) { 

            if (current_header_data.length != 0) {  // if the array was not empty, meaning last header was already run.

                // same here as for the times we hit a header, but without adding new next header data.
                input = current_header_data;

                // header processing function if data present on last line
                processIt = processHeader(input); 
                
                /* debug */
                if (debug) {
                    let processMsg = (processIt === 1) ? "\n** header processed successfully! (last line)" : (processIt == "unsupported") ? "\n** header unsupported! (last line)" : "\n** header processing failed! (last line)";
                    log_concat += processMsg;
                }

            }

        }

        /* debug */ if (debug) console.log("\n" + log_concat); // if debug is on, print concated log-message to the dev tools console.
      
        
    } // end main lines loop

    return 2; // return something specific

} // END // MAIN LINE ITERATOR FUNCTION
// -------------------------------------------------------




// APPLICATION PART II - "FROM OBJECT TO HISE SAMPLEMAP"
// -----------------------------------------------------

function fromObjToHiseMap () {


    var log_msg = ""; // concatenated log messages
    const groupsAmt = Object.keys(extendedOpcodesOutput.group.basic).length; // get amount of groups
    const mapName = extendedOpcodesOutput.sample_map_name; // fetch user input for sample map name

    var group_round_robin = sGroupSeqPosition_sw.checked; // takes on the true/false value of the ui element tick-box.

    // start HISE sample map.
    var xmlSampleMap = ""; 
    xmlSampleMap += '<?xml version="1.0" encoding="UTF-8"?>' + '\n\n'; 
    xmlSampleMap += '\n' + '<samplemap ID="' + mapName + '" RRGroupAmount="' + groupsAmt + '" MicPositions=";">\n';


    // declares, global vars and references.
    const regionsAmt = Object.keys(extendedOpcodesOutput.region.basic).length; // fetch the amount of regions/zones to put into the HISE Samplemap.
    const global_header = extendedOpcodesOutput.global;
    var the_group;
    var region_gr_id;
    var gr_resources;
    var hise_tag;
    var sfz_tag;
    var tag_to_process;
    var tag_value;
    var r; // for region loop.
    var j; // for opcode loop.

    /* debug */ if (debug) log_msg += ">> >> START part III - HISE SampleMap creation... ";

    for (r = 0; r < regionsAmt; r++) {

        // begin regions
        xmlSampleMap += '   <sample '; // begin hise sample zone.


        var the_region = extendedOpcodesOutput.region.basic[r];
        region_gr_id = the_region.gr_id;
        the_group = extendedOpcodesOutput.group.basic[region_gr_id];
        var levels = [the_region, the_group, global_header]; // store levels for easy reference to synced keys, accessed by levels[0-3].


        /* debug */ if (debug) log_msg += "-- -- processing sample_id " + r + " of sample group " + region_gr_id + " (id)...";

        // go through the hise tags and sync them with the hise supported Opcodes

        const keysAndRoot = assertKeyRangeAndRoot(region_gr_id, r); // get root key, HiKey, LoKey.
        const velRange = assertVelRange(region_gr_id, r); // get HiVel and LoVel.

        for (j = 0; j < hiseTags.length; j++) {


            hise_tag = hiseTags[j][0];
            sfz_tag = hiseTags[j][1]; // the sfz opcode can have aliases, so this could be a nested array
            tag_value = null; // declare and reset before check in the regions/headers. 


            // if not certain hise tags (separately handled), run a hirearchy run looking for sfz opcodes / alias values.
            if (hise_tag != "Root" && hise_tag != "LoKey" && hise_tag != "HiKey" && hise_tag != "LoVel" && hise_tag != "HiVel") {

                // check if sfz_tag has an alias, by checking if it is an array, and set references.
                let alias = Array.isArray(sfz_tag);
                let main_tag = (alias) ? sfz_tag[0] : sfz_tag;
                let dupl_tag = (alias) ? sfz_tag[1] : false;
                var level;
                
                // set the value and the level of the hirearcy, so we can add more potentials later.
                for (let i = 0; i < levels.length; i++) {

                    if ( levels[i][main_tag] !== undefined && levels[i][main_tag].length > 0 ) {
                        level = i;
                        tag_value = levels[i][main_tag];

                        /* debug */ if (debug) log_msg += "\nNEW opcode read : using MAIN SFZ TAG : " + main_tag + ", main_tag value: " + tag_value;
                        break; // break loop when first valid value is found.

                    } else if ( dupl_tag ) {

                        if ( levels[i][dupl_tag] !== undefined && levels[i][dupl_tag].length > 0 ) {

                            level = i; 
                            tag_value = levels[i][dupl_tag];

                            /* debug */ if (debug) log_msg += "\nNEW opcode read : using ALIAS SFZ TAG : " + dupl_tag + ", dupl_tag value: " + tag_value;
                            break;

                        }
                    }

                } // end for levels
            } // end hise_tag exclusions


            if (!tag_value) { tag_value = ""; } // just assign undefined values an empty string, or execution fails.


            // HISE specific tag logic

            if (hise_tag == "FileName") {

                let path = (levels[level].path) ? levels[level].path : "";
                tag_value = "{PROJECT_FOLDER}" + path + levels[level].sample;

                // check here for group, global, control as well later.

            } else if (hise_tag == "Volume") { // soon group vol as well. - choice box / radio buttons (setting)

                // check here for group, global, control as well later.
            } else if (hise_tag == "Pan"  ) {
            } else if (hise_tag == "Pitch") {

            } else if (hise_tag == "Root" ) {  tag_value = keysAndRoot.root_k;
            } else if (hise_tag == "LoKey") {  tag_value = keysAndRoot.lo_k;
            } else if (hise_tag == "HiKey") {  tag_value = keysAndRoot.hi_k;
            } else if (hise_tag == "LoVel") {  tag_value = velRange.lo_v;
            } else if (hise_tag == "HiVel") {  tag_value = velRange.hi_v; 

            } else if (
                hise_tag == "SampleStart" || 
                hise_tag == "SampleEnd"   || 
                hise_tag == "LoopEnabled" || 
                hise_tag == "LoopStart"   || 
                hise_tag == "LoopEnd"     || 
                hise_tag == "LoopXFade"   || 
                hise_tag == "SampleStartMod" 
            ) { tag_value = tag_value; } // empty string for now for any/all of these hise codes.


            if (tag_value == "") {  // lastly, ui user setting for empty string or falsy values

                if      (s_defaultNoValue_radioGr == 0)   { tag_value = ""; }   // just insert enpty string.
                else if (s_defaultNoValue_radioGr == 1)   { continue; }         // continue to the next, outputting nothing.
                /* else if (s_defaultNoValue_radioGr == 2)   { } -- this is not done yet, hise default values */
                
            }

            xmlSampleMap += hise_tag + '="' + tag_value + '" '; // just write out the hisetag and the opcode value.

        } // end for hise-tags (j).

        let seq = the_region.seq_position;
        let group = (group_round_robin && seq) ? seq : region_gr_id + 1; 

        xmlSampleMap += 'RRGroup="' + group + '" />\n'; // end sample zone, add new line.

    } // end for each region.

    
    /* debug */ if (debug) log_msg +=">> >> FINISHED part III - HISE SampleMap creation.";
    
    xmlSampleMap += '</samplemap>\n'; // close samplemap xml data.

    return xmlSampleMap;

} // END APPLICATION PART II - "FROM OBJECT TO HISE MAP OUTPUT CODE"




// MAIN application initiator, on button click - runs the function and sub-functions of the app.
// ---------------------------------------------------------------------------------------------
function parseSfzToHise() {

    debug = sDebug_sw.checked; // turn on debug mode if the form checkbox was ticked.
    s_defaultNoValue_radioGr = document.querySelector('input[name="s_defaultNoValue_radioGr"]:checked').value; // user setting for empty values on opcodes.
    arraysInsteadOfObjects = sArraysInsteadOfObjects_sw.checked; // front-end tick-box for using array or object-keys for regions.


    if (sfzFileData == undefined || sfzFileData == "") {
        let error = "[Error] : Input file data not present or loaded. Please load a file.";
        statsOutput.innerHTML = '<span style="color:red;">- !!! INPUT FILE ERROR: ' + error + '</span>\n';
        console.log(error);
        return { error: error }; // returns error to any call to parseSfzToHise()
    }

    resetExtendedOpcodesObject(); // re-initialize the storage object literal for all found opcodes and values.

    // set sample name - first check for the desired name in front-end user settings
    extendedOpcodesOutput.sample_map_name = (sMapName.value.length > 0) ? sMapName.value : "sfz-to-HISE-convert";

    splitLines(); // split latest loaded data into array of text lines.
    progressBar(0); // reset the progressbar to 0 every time we attempt to run. 

    console.log(":: BEGIN SFZ CONVERSION...");
    var startTime = (new Date()).getTime();
    console.log(">> >> START string replacement pre-run...\n-----------------------------------------");

    // start pre-processing of sample paths
    const sfzStringPreProcessing = preStringReplacements();

    if (sfzStringPreProcessing.error) { // on errors
        console.log(sfzStringPreProcessing.error);
        console.log("!!! Error occurred. Translation cancelled.");
        return false;
    } 

    /* debug */ if (debug) console.log(sfzStringPreProcessing); // return the output (processing log).

    console.log("-----------------------------------------\n<< << FINISHED string replacement pre-run.");
    var endTime = (new Date()).getTime();
    console.log(((endTime - startTime) / 1000) + " seconds elapsed - string replacement pre-run."); // output duration time for running (async perhaps an issue here)

    startTime = (new Date()).getTime();
    console.log(">> >> START Main Translator function...\n-----------------------------------------");

    const processSfz = processSfzReadFunc(); // start main application function.


    if (processSfz === 2) {
        
        endTime = (new Date()).getTime();
        console.log("-----------------------------------------\n<< << FINISHED part I - Main Translator function - token extraction (" + ((endTime - startTime) / 1000) + " seconds)");

        startTime = (new Date()).getTime();
        console.log(">> >> START part II - SampleMap & Extended Token Object Output...\n-----------------------------------------");


        extendedOpcodesOutput_clipboard = JSON.stringify(extendedOpcodesOutput, null, 4); // makes a string with pretty-printed JSON for copy-to-clipboard action.

        // run pt II - from obj to hise xml:
        const objToHiseMap = fromObjToHiseMap();


        if (objToHiseMap) {

            outputPre.innerText = objToHiseMap; // insert the HISE sample map to the front-end.

            endTime = (new Date()).getTime();
            console.log("-----------------------------------------\n<< << FINISHED part II - SampleMap & Extended Token Object Output (" + ((endTime - startTime) / 1000) + " seconds)");
            console.log(":: FINISHED SFZ CONVERSION.\n---------------------------");

            statsOutput.innerText += "\n--> SFZ conversion succeeded!"; // front-end stats message.

            // output the HISE SampleMap to the console as well, in case of front-end output faliures.
            console.log("[ OUTPUT - HISE SAMPLEMAP: ]");
            console.log(objToHiseMap); // the returned xmlSampleMap from function.
            hiseMapOutput_clipboard = objToHiseMap; // for copy to clipboard on ui.
           

        } else { 
            outputPre.innerText = "!!! Application part II error, from object to HISE map... ";
            return false;
        }

        console.log("[ OUTPUT - Extended Opcodes Object (JSON): ]");
        console.log(extendedOpcodesOutput); // log the extended opcodes output in all cases.
        


    } else { 
        outputPre.innerText = "!!! Application part I error, from SFZ to data object...";
        return false;
    }


} // end main parseSfzToHise() function.
