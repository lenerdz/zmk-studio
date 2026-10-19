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

O que não muda: a edição do keymap e o que o app lê do teclado ou grava nele para isso.
Os ícones afetam apenas como as teclas são desenhadas e como o app é hospedado; a aba
Lights (abaixo) acrescenta requisições próprias e só é usada quando o firmware as tem.

## Cores das luzes (a aba Lights)

Com um firmware que tem mapas de luzes editáveis, o cabeçalho ganha uma segunda visão,
**Lights**, ao lado de **Keyboard**. Ela desenha o teclado e permite pintar a cor de cada
LED (o que fica sob cada tecla e o underglow) de cada camada:

- Escolha uma camada, escolha uma cor (uma das 14 cores da paleta de `led_colors.dtsi`, o
  seletor de cor do sistema ou um valor hexadecimal) e arraste sobre os LEDs. O teclado
  mostra as cores quando você solta.
- Preencha todos os LEDs, somente as teclas ou somente o underglow, e devolva uma camada
  às cores com que o firmware foi compilado.
- **Save** e **Discard** no cabeçalho agem sobre as teclas e sobre as luzes juntas, e
  **Undo** e **Redo** cobrem as duas. **Restore Stock Settings** também devolve as cores
  de fábrica.
- **Export led_colors.dtsi** baixa as cores como o `config/led_colors.dtsi` do
  [corne-zmk](https://github.com/lenerdz/corne-zmk), para compilá-las no firmware como os
  novos padrões.

Ela precisa do módulo [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix) de
lenerdz (branch `corne-fixes`) e do protocolo do
[zmk-studio-messages](https://github.com/lenerdz/zmk-studio-messages), que acrescentam seis
requisições e uma notificação ao subsistema keymap do ZMK Studio. Com qualquer outro
firmware a visão Lights não é oferecida (o teclado responde "RPC not found" à primeira
requisição) e o app funciona como antes. O app conversa com o teclado por uma cópia do
cliente TypeScript incluída no repositório (vendored) que traz essas mensagens
([`src/vendor/zmk-studio-ts-client`](src/vendor/zmk-studio-ts-client/README.md)).

Para experimentar sem um teclado, use o **Demo keyboard** (veja
[Desenvolvimento](#desenvolvimento)). Como funciona, o protocolo e os arquivos:
[`src/lights/README.md`](src/lights/README.md).

## Situação

Os ícones foram verificados com as stories do Storybook, cujos dados de exemplo
([`src/keyboard/corne.mock.ts`](src/keyboard/corne.mock.ts)) seguem o código-fonte do ZMK
e do [zmk-rgb-matrix](https://github.com/lenerdz/zmk-rgb-matrix), e usados com um Corne
real conectado por USB: os ícones e os rótulos funcionaram (relato do dono do teclado).
Se uma tecla mostrar um rótulo errado ou vazio, o nome do comportamento exibido na dica
(tooltip) dela é o que as regras de `src/keyboard/bindingDisplay.tsx` precisam tratar.

A aba Lights foi testada em um navegador com o teclado de demonstração, pela mesma
moldura (framing) e codificação de mensagens usadas com um teclado real, e é coberta por
`npm test`. Ela **ainda não foi testada em um teclado real**.

## Como usar

1. Abra a página em um navegador com suporte a WebSerial (Chrome, Edge ou outro
   navegador baseado em Chromium). Firefox e Safari não têm.
2. O firmware do teclado precisa ter o ZMK Studio habilitado; veja a
   [documentação do ZMK Studio](https://zmk.dev/docs/features/studio).
3. Conecte o teclado por USB (em um teclado dividido, a metade que executa o Studio, a
   central), escolha **USB** e desbloqueie com a tecla associada a `&studio_unlock`.
4. Se o firmware tiver mapas de luzes editáveis, escolha **Lights** no cabeçalho para
   editar as cores.

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

Para experimentar o app, incluindo a aba Lights, sem um teclado, escolha **Demo keyboard**
na lista de conexões. Ele está sempre presente com `npm run dev`; no app publicado,
acrescente `?demo` ao endereço (<https://lenerdz.github.io/zmk-studio/?demo>). **Demo
keyboard (no light maps)** responde como um firmware sem os mapas. Veja
[`src/lights/demo/README.md`](src/lights/demo/README.md).

Para executar os testes:

```
npm test
```

Para compilar como o workflow faz (o site fica em `/<repository>/`):

```
VITE_BASE_PATH=/zmk-studio/ npm run build
```

O workflow executa `npm test` antes de compilar; por isso uma versão cujos testes falham
não é publicada.

Dois arquivos da aba Lights são gerados a partir de `config/led_colors.dtsi` do corne-zmk;
veja [`src/lights/README.md`](src/lights/README.md) para gerá-los de novo.

### Acompanhar o upstream

```
git remote add upstream https://github.com/zmkfirmware/zmk-studio.git
git fetch upstream
git merge upstream/main
```

Os workflows `release-please` e `tauri-build` do upstream dependem de segredos e de uma
matriz de build que este fork não tem; por isso estão desativados nas configurações do
repositório (aba Actions). Os arquivos em si são idênticos aos do upstream.

O cliente RPC está incluído no repositório (vendored); por isso o `package.json` não lista
mais `@zmkfirmware/zmk-studio-ts-client`: uma nova versão dele, ou novas mensagens do
upstream, precisam ser portadas à mão (veja
[`src/vendor/zmk-studio-ts-client`](src/vendor/zmk-studio-ts-client/README.md)).

## Arquivos alterados em relação ao upstream

Adicionados: `src/keyboard/bindingDisplay.tsx`, `src/keyboard/BindingLabel.tsx`,
`src/keyboard/Keymap.stories.tsx`, `src/keyboard/corne.mock.ts`,
`src/lights/` (a aba Lights, o teclado de demonstração e seus testes),
`src/vendor/zmk-studio-ts-client/` (o cliente RPC com as mensagens do fork),
`scripts/generate-led-data.mjs`, `.github/workflows/pages.yml`, `README.pt-BR.md`.

Modificados: `README.md` (substituído), `NOTICE`, `.gitignore`, `index.html`, `download.html`,
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`,
`src/keyboard/Keymap.tsx`, `src/hid-usage-name-overrides.json`, `src/App.tsx`,
`src/AppFooter.tsx`, `src/AppHeader.tsx`, `src/ConnectModal.tsx`, `src/DownloadPage.tsx`,
`src/rpc/logging.ts`, `src/undoRedo.ts`.

Os arquivos de código modificados trazem um comentário informando isso; nos arquivos JSON,
HTML e de texto, esta lista é o aviso.

## Licença

Apache License 2.0, como no upstream. Veja [LICENSE](LICENSE) e [NOTICE](NOTICE).
