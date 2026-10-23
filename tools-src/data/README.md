# Font preparation data

`frequent-han.json` contains the 1000 highest-count Han code points from the `kHanyuPinlu` property in Unicode Unihan 17.0.0. Counts for alternate readings are summed; ties use code-point order. The list chooses the core font only and never limits document character coverage.

Source: https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip (`Unihan_Readings.txt`). See `UNICODE-LICENSE.txt`.

`font-sources/CascadiaMono-Regular.ttf` is the unmodified static Regular face from Microsoft's Cascadia Code 2407.24 release: https://github.com/microsoft/cascadia-code/releases/tag/v2407.24 . The generated, renamed Meze Code fonts retain its outlines and metrics. The OFL license is included with the browser font files.
