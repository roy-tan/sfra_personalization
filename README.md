# SFRA Personalization 

This cartridge implements the following to handle personalization for SFRA:
1. Allows merchandiser to specify under Site Preferences the specific categories for personalization
2. Use the session.clickStream object to analyze and filter out clicks to product detail page (PDP)
3. Check if the category specified in Step 1 is a parent or ancestor of the product from PDP. If so, add to the count
4. The category with the highest count will be deemed as the most popular category 
5. Set the most popular category id to the custom attribute (session.custom.personalization) used by the customer group
6. The updated customer group will show the respective content slot 
