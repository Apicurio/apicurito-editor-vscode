# Apicurito Editor (Preview version)

Provides Apicurito editor inside Visual Studio Code. [Apicurito](https://github.com/Apicurio/apicurito) is a standalone light-weight version of [Apicurio](https://www.apicur.io/) editor.

Enables visual editing of API designs in the format described by the [OpenAPI](https://www.openapis.org/) specification.

# Usage

Install the extension by opening the `.vsix` file from the VS Code extension panel (`Ctrl+Shift+X`), or run the extension in a debug mode (see below).

Navigate to an existing API definition or an empty JSON file in the Explorer panel and open it.

You can then right-click on the file in the Explorer panel to select `Open in Apicurito editor` or use the Command Palette (`Ctrl+Shift+A`).

Save the edited design in the Apicurito editor by clicking on the blue `Save` button in the top right
or pressing `Ctrl+S`.

Currently, Apicurito does not preserve the whitespace formatting of the edited JSON file.

# Build (Debug)

Open the project directory in the terminal. and run `yarn install` and then `yarn compile`.

Open the project directory in the VS Code, and press `F5`.

# Build the .vsix file

Open the project directory in the terminal. Install `vsce` using `npm install -g vsce`, run `npm install` and then `vsce package`. Continue if a warning appears. The `.vsix` file will be generated in the project directory.
