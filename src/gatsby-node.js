import * as R from 'ramda'
import { map } from 'asyncro'

import fetchData from './fetch'
import { nodeHelpers, createNodeFactory } from './nodeHelpers'
import {
  generateTypeDefsForCustomType,
  generateTypeDefForLinkType,
} from './generateTypeDefsForCustomType'
import standardTypes from './standardTypes.graphql'
import { documentToNodes } from './documentToNodes'

export const sourceNodes = async (gatsbyContext, pluginOptions) => {
  const {
    schema,
    actions: { createNode, createTypes },
  } = gatsbyContext

  // Set default plugin options.
  pluginOptions = {
    linkResolver: () => {},
    htmlSerializer: () => {},
    fetchLinks: [],
    schemas: {},
    lang: '*',
    shouldNormalizeImage: () => true,
    ...pluginOptions,
  }

  const {
    repositoryName,
    accessToken,
    fetchLinks,
    lang,
    schemas,
  } = pluginOptions

  const typeVals = R.pipe(
    R.mapObjIndexed((customTypeJson, customTypeId) =>
      generateTypeDefsForCustomType({
        customTypeId,
        customTypeJson,
        gatsbyContext,
        pluginOptions,
      }),
    ),
    R.values,
  )(schemas)

  const typeDefs = R.pipe(
    R.map(R.prop('typeDefs')),
    R.flatten,
  )(typeVals)

  const typePaths = R.pipe(
    R.map(R.prop('typePaths')),
    R.flatten,
  )(typeVals)

  const linkTypeDef = generateTypeDefForLinkType(typeDefs, schema)

  createTypes(standardTypes)
  createTypes(linkTypeDef)
  createTypes(typeDefs)

  const { documents } = await fetchData({
    repositoryName,
    accessToken,
    fetchLinks,
    lang,
  })

  const nodes = await map(
    documents,
    async doc =>
      await documentToNodes(doc, { typePaths, gatsbyContext, pluginOptions }),
  )

  R.flatten(nodes).forEach(node => createNode(node))

  return
}
