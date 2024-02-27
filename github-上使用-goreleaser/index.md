# github 上使用 goreleaser


## 1. goreleaser 的简单说明

```shell
# install goreleaser
brew install goreleaser

# init goreleaser, create .goreleaser.yml
goreleaser init

# available commands
goreleaser build --clean
goreleaser release --snapshot --clean

```

## 2. .goreleaser.yml 示例文件

```yaml
# This is an example .goreleaser.yml file with some sensible defaults.
# Make sure to check the documentation at https://goreleaser.com
before:
  hooks:
    # You may remove this if you don&#39;t use go modules.
    - go mod tidy
    # you may remove this if you don&#39;t need go generate
#    - go generate ./...
builds:
  - id: http-tunnel-client
    binary: http-tunnel-client
    main: ./cmd/http-tunnel-client
    env:
      - CGO_ENABLED=0
    goos:
      - linux
      - windows
      - darwin
    goarch:
      - amd64
      - arm64
  - id: http-tunnel-server
    binary: http-tunnel-server
    main: ./cmd/http-tunnel-server
    env:
      - CGO_ENABLED=0
    goos:
      - linux
      - windows
      - darwin
    goarch:
      - amd64
      - arm64
archives:
  - format: tar.gz
    # this name template makes the OS and Arch compatible with the results of uname.
    name_template: &gt;-
      {{ .ProjectName }}_
      {{- .Version }}_
      {{- title .Os }}_
      {{- .Arch }}
      {{- if .Arm }}v{{ .Arm }}{{ end }}
    # use zip for windows archives
    format_overrides:
      - goos: windows
        format: zip
checksum:
  name_template: &#39;checksums.txt&#39;
snapshot:
  name_template: &#34;{{ incpatch .Version }}-next&#34;
changelog:
  sort: asc
  filters:
    exclude:
      - &#39;^docs:&#39;
      - &#39;^test:&#39;

# The lines beneath this are called `modelines`. See `:help modeline`
# Feel free to remove those if you don&#39;t want/use them.
# yaml-language-server: $schema=https://goreleaser.com/static/schema.json
# vim: set ts=2 sw=2 tw=0 fo=cnqoj
```

## 3. github action 配置

文件路径：`.github/workflows/goreleaser.yml`

```yaml
name: goreleaser

on:
  push:
    tags:
      - &#39;*.*.*&#39;
  # Trigger the workflow by mannually
  workflow_dispatch:

jobs:
  goreleaser:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: &#39;1.20&#39;

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v4
        with:
          version: latest
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 4. github token 

**read write permisson**

![github token](/ooooo-notes/images/goreleaser-github-token.png)


---

> 作者: 线偶  
> URL: https://ooooo-youwillsee.github.io/ooooo-notes/github-%E4%B8%8A%E4%BD%BF%E7%94%A8-goreleaser/  

