Objective: Find a way to convert a psd into a pdf and auto populate it given a subjects info.

Current tech: pdf-lib, ImageMagick

PDF Lib -> https://github.com/Hopding/pdf-lib/blob/b8a44bd24b74f4f32456e9809dc4d2d9dc9bf176/src/api/form/PDFTextField.ts#L49

Current findings/rumblings:

PSD -> PDF Conversion 
    - Currently requires image magick at the current time.  couldn't find a way to get graphics magick to convert.
    - Command for conversion => magick convert input.psd output.pdf
    - Need to find ways to set the fonts for different languages.
    - Once the certificate block is done I should probably outline a function for the rest.  May not though since there should really only be 3 segments on document.

