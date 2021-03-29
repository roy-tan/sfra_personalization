'use strict';

var HashMap = require('dw/util/HashMap');
var ProductMgr = require('dw/catalog/ProductMgr');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
var Logger = require('dw/system/Logger');

/**
 * Return category for a given product
 * @param {string} pid - Product ID
 * @returns {dw.catalog.Category} category
 */
function getCategory(pid) {
    var apiProduct = ProductMgr.getProduct(pid);
    var category = apiProduct.getPrimaryCategory();
    if (!category && productHelper.getProductType(apiProduct) !== 'master') {
        category = apiProduct.getMasterProduct().getPrimaryCategory();
    }
    return category;
}

/**
 * Get category of a product when user clicks on a PDP
 *
 * @param {dw.web.ClickStreamEntry} click
 * @returns {dw.catalog.Category} category
 */
function getProductCategory(click) {
    var category;
    if (click.pipelineName == "Product-Show") {
        groups = click.queryString.split("&");
        if (groups[0].search("pid") > -1) {
            pid = groups[0].split("=")[1];
            category = getCategory(pid);
        }
    }
    return category;
}

/**
 * Get categories defined in site preferences and initialize count to zero
 *
 * @param {array} categoryIds - List of categories specified in site preferences (personalisation -> categoryIds)
 * @returns {dw.util.HashMap} categoryMap
 */
function getSiteCategoryMap(categoryIds) {
    var categoryMap = new HashMap();
    for (var i = 0, l = categoryIds.length; i < l; i++) {
        categoryMap.put(categoryIds[i], 0);
    }
    return categoryMap;
}

/**
 * Set site category count if is the same as OR an ancestor of the product's category
 *
 * @param {dw.util.HashMap} siteCategoryMap
 * @param {dw.catalog.Category} productCategory
 * @returns {dw.util.HashMap} siteCategoryMap
 */
function updateCount(siteCategoryMap, productCategory) {
    var siteCategory;
    var iterator = siteCategoryMap.keySet().iterator();
    while (iterator.hasNext()) {
        categoryId = iterator.next();
        siteCategory = CatalogMgr.getCategory(categoryId);
        if (productCategory == siteCategory || productCategory.isSubCategoryOf(siteCategory)) {
            siteCategoryMap[categoryId] = siteCategoryMap[categoryId] + 1;
            break;
        }
    }
    return siteCategoryMap;
}

/**
 * Traverse siteCategoryMap and return the category with the highest count. If multiple categories has the same count,
 * it will return the category that is set last in the site preferences
 *
 * @param {array} categoryIds - List of categories specified in site preferences (personalisation -> categoryIds)
 * @param {dw.util.HashMap} siteCategoryMap
 * @returns {string} popularCategoryId
 */
function getMostPopularCategory(categoryIds, siteCategoryMap) {
    var popularCategoryId;
    count = 0;
    for (var i = 0; i < categoryIds.length; i++) {
        categoryId = categoryIds[i];
        Logger.info('categoryId: {0}, count: {1}', categoryId, siteCategoryMap[categoryId]);
        if (count <= siteCategoryMap[categoryId]) {
            count = siteCategoryMap[categoryId];
            if (count > 1) {
                popularCategoryId = categoryId;
            }
        }
    }
    return popularCategoryId;
}

function processClickStream() {
    try {
        var cs = session.clickStream;
        if (cs.isEnabled()) {
            var Site = require('dw/system/Site');
            var categoryIds = Site.current.getCustomPreferenceValue('categoryIds');
            var siteCategoryMap = getSiteCategoryMap(categoryIds);
            var clicks = cs.getClicks();
            for (var i = 0; i < clicks.length - 1; i++) {
                productCategoryId = clicks.get(i);
                var productCategory = getProductCategory(productCategoryId);
                if (productCategory != null) {
                    siteCategoryMap = updateCount(siteCategoryMap, productCategory);
                }
            }
            popularCategoryId = getMostPopularCategory(categoryIds, siteCategoryMap);
            if (popularCategoryId != null) {
                session.custom.personalization = popularCategoryId;
                Logger.info('session.custom.personalization: {0}', session.custom.personalization);
            }
        }
    } catch (e) {
        Logger.error('sfra_personalization error: {0}', e.message);
    }
}

module.exports = {
    processClickStream: processClickStream
};