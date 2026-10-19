# ZMK Studio (fork não oficial)

[English](README.md) | Português (Brasil)

Este é um fork não oficial do [ZMK Studio](https://github.com/zmkfirmware/zmk-studio),
o app web que edita ao vivo o keymap de um teclado [ZMK](https://zmk.dev/). Ele é
mantido por [lenerdz](https://github.com/lenerdz) para um teclado Corne.

Ele **não** é o ZMK Studio oficial e **não** é endossado pelo ZMK Project. O nome e o
logotipo do ZMK são do ZMK Project: permanecem neste fork apenas porque ele é uma
cópia modificada do app. Para obter ajuda com o app oficial, procure o ZMK Project.

**Para usar:** <https://lenerdz.github.io/zmk-studio/>

## O que muda em relação ao upstream

O upstream desenha cada tecla como o nome do comportamento (pequeno, em cima) e o
primeiro parâmetro do binding como um uso HID (embaixo). Isso está certo para teclas
comuns, mas para qualquer comportamento cujos parâmetros não sejam usos HID (perfis
Bluetooth, comandos de iluminação, camadas por número, ...) a tecla fica vazia ou mostra
um rótulo sem sentido.

Este fork desenha, nessas teclas, um ícone e um rótulo curto. Passar o mouse sobre uma
tecla mostra a descrição completa (por exemplo, `Bluetooth: Select Profile 2`).

| Comportamento (behavior), com o nome que o firmware informa | O que é desenhado |
|---|---|
| `Key Press` | Sem mudança: o rótulo da tecla. As teclas de mídia (volume, mudo, brilho, play/pause) são desenhadas como ícones |
| `Momentary Layer`, `Toggle Layer`, `To Layer`, `Sticky Layer` | Um ícone e o nome da camada |
| `Layer-Tap` | O ícone de camada, o nome da camada e a tecla de toque |
| `Mod-Tap` | A tecla de toque e, depois, o modificador de segurar |
| `Sticky Key`, `Key Toggle` | Um ícone e a tecla |
| `Key Repeat` | Um ícone |
| `Bluetooth` | O ícone de Bluetooth com o número do perfil (selecionar, desconectar), ou a ação (limpar, limpar todos, próximo, anterior) |
| `Output Selection` | USB, Bluetooth, alternar ou nenhuma saída |
| `Underglow`, `Backlight` e comportamentos de iluminação que informam os mesmos comandos | Um ícone e uma palavra curta por comando: `on/off`, `hue`, `sat`, `bri`, `speed`, `time`, `effect`, `reset`, `color`, com um sinal de mais ou de menos para subir e descer |
| Comportamentos chamados `fx_*` (um por efeito de iluminação) | O cabeçalho `Effect`, um ícone escolhido pelo nome do efeito e o próprio nome |
| `Studio Unlock`, `Caps Word`, `Reset`, `Bootloader`, `External Power`, `Mouse Key Press`, `Grave/Escape` | Um ícone ou um texto curto |
| `Transparent`, `None` | Um ícone esmaecido |
| Qualquer outro | Um rótulo montado a partir das descrições de parâmetros que o firmware informa: uso HID, nome da camada, número ou nome da constante |

Tudo é derivado do que o firmware informa (o nome de exibição do comportamento e as
descrições dos parâmetros); por isso, um comportamento que este fork não conhece ainda
recebe um rótulo genérico. As regras ficam em
[`src/keyboard/bindingDisplay.tsx`](src/keyboard/bindingDisplay.tsx);
[`src/keyboard/BindingLabel.tsx`](src/keyboard/BindingLabel.tsx) desenha o resultado.

Outras mudanças:

- As seis teclas de mídia que o upstream rotula com emoji (brilho, play/pause, mudo, volume) são
  desenhadas como ícones, e os emoji foram removidos de `src/hid-usage-name-overrides.json`.
- O rodapé, os títulos das páginas, a página de download e o `NOTICE` informam que este é
  um fork não oficial. A página de download aponta para os apps oficiais, que não incluem
  estas mudanças.
- O app pode ser servido a partir de um subdiretório (`VITE_BASE_PATH`), e o workflow
  [`.github/workflows/pages.yml`](.github/workflows/pages.yml) o publica no GitHub Pages.
- Stories do Storybook com o keymap de um Corne, uma por camada (`Keyboard/Keymap (Corne)`).

O que não muda: o protocolo, o que é lido do teclado ou gravado nele, e o firmware. As
mudanças afetam apenas como as teclas são desenhadas e como o app é hospedado.

### Situação

Verificado com as stories do Storybook, cujos dados de exemplo
([`src/keyboard/corne.mock.ts`](src/keyboard/corne.mock.ts)) seguem o código-fonte do ZMK
e do [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix). Ainda não verificado
com um teclado real conectado por USB. Se uma tecla mostrar um rótulo errado ou vazio, o
nome do comportamento exibido na dica (tooltip) dela é o que as regras de
`src/keyboard/bindingDisplay.tsx` precisam tratar.

## Como usar

1. Abra a página em um navegador com suporte a WebSerial (Chrome, Edge ou outro
   navegador baseado em Chromium). Firefox e Safari não têm.
2. O firmware do teclado precisa ter o ZMK Studio habilitado; veja a
   [documentação do ZMK Studio](https://zmk.dev/docs/features/studio).
3. Conecte o teclado por USB (em um teclado dividido, a metade que executa o Studio, a
   central), escolha **USB** e desbloqueie com a tecla associada a `&studio_unlock`.

## Desenvolvimento

```
npm ci
npm run dev
```

`npm run dev` e `npm run build` executam antes `npm run generate-data`, que baixa da API do
GitHub os dados da última versão do upstream (defina `GITHUB_TOKEN` para evitar limites de
requisição). Para ver os rótulos das teclas sem um teclado:

```
npm run storybook
```

Para compilar como o workflow faz (o site fica em `/<repository>/`):

```
VITE_BASE_PATH=/zmk-studio/ npm run build
```

### Acompanhar o upstream

```
git remote add upstream https://github.com/zmkfirmware/zmk-studio.git
git fetch upstream
git merge upstream/main
```

Os workflows `release-please` e `tauri-build` do upstream dependem de segredos e de uma
matriz de build que este fork não tem; por isso estão desativados nas configurações do
repositório (aba Actions). Os arquivos em si são idênticos aos do upstream.

## Arquivos alterados em relação ao upstream

Adicionados: `src/keyboard/bindingDisplay.tsx`, `src/keyboard/BindingLabel.tsx`,
`src/keyboard/Keymap.stories.tsx`, `src/keyboard/corne.mock.ts`,
`.github/workflows/pages.yml`, `README.pt-BR.md`.

Modificados: `README.md` (substituído), `NOTICE`, `.gitignore`, `index.html`, `download.html`,
`vite.config.ts`, `src/keyboard/Keymap.tsx`, `src/hid-usage-name-overrides.json`,
`src/AppFooter.tsx`, `src/AppHeader.tsx`, `src/ConnectModal.tsx`, `src/DownloadPage.tsx`.

Os arquivos de código modificados trazem um comentário informando isso; nos arquivos JSON,
HTML e de texto, esta lista é o aviso.

## Licença

Apache License 2.0, como no upstream. Veja [LICENSE](LICENSE) e [NOTICE](NOTICE).
