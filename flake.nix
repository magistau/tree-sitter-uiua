{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
    uiua = {
      url = "github:uiua-lang/uiua";
      inputs = {
        nixpkgs.follows = "nixpkgs";
        flake-parts.follows = "flake-parts";
      };
    };
  };
  outputs =
    { nixpkgs, flake-parts, ... }@inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = nixpkgs.lib.platforms.all;
      perSystem =
        { pkgs, inputs', ... }:
        {
          devShells.github = pkgs.mkShell {
            env.TREE_SITTER_JS_RUNTIME = "bun";
            packages = with pkgs; [
              redo-apenwarr
              bun
              tree-sitter
              typescript
              dprint
              inputs'.uiua.packages.default
            ];
          };
          apps =
            let
              common = {
                runtimeInputs = with pkgs; [
                  redo-apenwarr
                  bun
                  tree-sitter
                  typescript
                  dprint
                  inputs'.uiua.packages.default
                ];
                runtimeEnv = {
                  TREE_SITTER_JS_RUNTIME = "bun";
                };
              };
            in
            {
              gha-check.program = pkgs.writeShellApplication {
                name = "gha-check";
                inherit (common) runtimeInputs runtimeEnv;
                text = ''
                  redo -xvk package.json
                  bun install --ignore-scripts
                  redo -xvk check
                '';
              };
              gha-generate.program = pkgs.writeShellApplication {
                name = "gha-generate";
                inherit (common) runtimeInputs runtimeEnv;
                text = ''
                  redo -xvk
                  tree-sitter init
                  tree-sitter generate --log
                  rm -rf .redo
                '';
              };
            };
        };
    };
}
