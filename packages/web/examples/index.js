import { html, render } from 'https://unpkg.com/lit-html?module'

const LANGUAGES = {
  TypeScript:
    'https://raw.githubusercontent.com/gilbarbara/logos/master/logos/typescript-icon.svg',
  JavaScript:
    'https://raw.githubusercontent.com/gilbarbara/logos/master/logos/javascript.svg',
}

const EXAMPLES = [
  {
    name: 'Vanilla',
    // Example Framework with image and link:
    //   framework: {
    //     logo:
    //       'https://raw.githubusercontent.com/gilbarbara/logos/master/logos/react.svg',
    //     name: 'React',
    //     url: 'https://reactjs.org',
    //   },
    framework: {
      name: 'None',
    },
    links: [
      {
        url: '/ts-vanilla/',
        language: 'TypeScript',
      },
      {
        url: '/vanilla/',
        language: 'JavaScript',
      },
    ],
  },
]

const template = (examples) => html`
  ${examples.map(
    (example) => html`<tr>
      <td class="px-6 py-4 whitespace-nowrap">${example.name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div class="flex items-center">
          ${example.links.map((link, i) => {
            return html`<a href="${link.url}">
              <img
                src="${LANGUAGES[link.language]}"
                width="20"
                height="20"
                title="${link.language}"
                class="${i > 0 ? 'ml-2' : ''}"
              />
            </a>`
          })}
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        ${example.framework.logo && example.framework.url
          ? html`<div class="flex items-center">
              <img
                src="${example.framework.logo}"
                width="20"
                title="${example.framework.name}"
              />
              <div class="ml-2">${example.framework.name}</div>
            </div>`
          : html`${example.framework.name}`}
      </td>
    </tr>`
  )}
`

render(template(EXAMPLES), document.getElementById('examples-body'))
