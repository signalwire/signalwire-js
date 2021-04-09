import { html, render } from 'https://unpkg.com/lit-html?module'

export const EXAMPLES = [
  {
    name: 'Vanilla',
    url: '/ts-vanilla/',
    language: 'TypeScript',
    framework: {
      name: 'None',
    },
  },
  // {
  //   name: "React",
  //   url: "/ts-react",
  //   language: "TypeScript",
  //   framework: {
  //     logo:
  //       'https://raw.githubusercontent.com/gilbarbara/logos/master/logos/react.svg',
  //     name: 'React',
  //     url: 'https://reactjs.org',
  //   },
  // }
]

const template = (examples) => html`
  ${examples.map(
    (example) => html`<tr>
      <td class="px-6 py-4 whitespace-nowrap">
        <a class="text-indigo-600 hover:text-indigo-900" href="${example.url}"
          >${example.name}</a
        >
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${example.language}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        ${example.framework.logo && example.framework.url
          ? html` <div class="flex items-center">
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
