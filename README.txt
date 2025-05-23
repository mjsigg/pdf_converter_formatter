Objective: Find a way to convert a psd into a pdf and auto populate it given a subjects info.

Current tech: pdf-lib, ImageMagick

PDF Lib -> https://github.com/Hopding/pdf-lib/blob/b8a44bd24b74f4f32456e9809dc4d2d9dc9bf176/src/api/form/PDFTextField.ts#L49

Current findings/rumblings:

PSD -> PDF Conversion 
    - Currently requires image magick at the current time.  couldn't find a way to get graphics magick to convert.
    - Command for conversion => magick convert input.psd output.pdf
    - Need to find ways to set the fonts for different languages.
    - Once the certificate block is done I should probably outline a function for the rest.  May not though since there should really only be 3 segments on document.

22 May 2025

-Attempting to add a feature to automate this process.  Going to use cloud storage and and functions to automate.  Maybe have it trigger with the file detection? Still need to flesh this part out but getting
the functionality ready with cloud cli.

- Another todo feature be able to parse xlsx

Download the .xlsx file from GCS.
Use xlsx or exceljs to parse the Excel data.
Process the data as needed (e.g., convert to CSV, extract specific values, transform data).
Upload the processed output (whether it's CSV, JSON, or another Excel file) back to a GCS bucket.



