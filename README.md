# SFZ to HISE converter / translator application

This is the **open source repository for the [SFZ to HISE converter / translator](https://keypleezer.com/sfz-to-hise-converter/)** JavaScript application. It reads and parses [SFZ](https://sfzformat.com/) instruments (*music sampler instrument files*), processes the opcodes and values (*sample files, key root, hikey, lokey, velocity mappings etc*) and makes **HISE** samplemaps and JSON data objects. 

[HISE](https://www.hise.audio/) is an open source music application and plugin framework for making musical instrument/effect plugins in the VST / AU / RTAS or AAX formats. HISE has a built in SFZ importer tool. This tool aims to provide an **alternative to the native HISE SFZ importer** and apart from a HISE samplemap **also creates a JSON object literal**, containing **all opcode data found** in the SFZ instrument file. The JSON object can be copied to clipboard with one click in either raw JSON form or in a variable for HISE-script / JavaScript (*or any other language*) and pasted into a file directly, for scripting convenience.

The [SFZ to HISE converter](https://keypleezer.com/sfz-to-hise-converter/) is made in JavaScript and intended for **use in a modern web browser**. It includes an application html file, including a user interface (web ui) along with a couple of .js files that contain the application. You can either [use it on the KeyPleezer website](https://keypleezer.com/sfz-to-hise-converter/) or download a zip from this project. 

The **published web app** can be used here:
https://keypleezer.com/sfz-to-hise-converter/

A **published manual** can be found here:
https://keypleezer.com/sfz-to-hise-converter/manual/



## SFZ header support

**The following SFZ headers are currently supported (analyzed):**

- <control>, <global>, <group> and <region>.

These are the main headers used for opcodes that is used to create the components for each sample used in a **HISE** XML samplemap. 

The following SFZ headers are ***being integrated***:

- <master>, <curve>, <effect>, <midi>.

[Read about the HISE markup tags and SFZ opcodes used in the Manual >>](https://keypleezer.com/sfz-to-hise-converter/manual/)

## License

This repo is licensed under the MIT open source license (with additional points). The license can be found in the `_license` folder or [downloaded here](https://keypleezer.com/files-press/licenses/sfz-to-hise-converter-license.zip) (html/md/pdf/rtf).
