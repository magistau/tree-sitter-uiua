redo-ifchange uiua-version
curl -L "https://github.com/uiua-lang/uiua/raw/refs/tags/$(cat uiua-version)/site/primitives.json" -o "$3"
