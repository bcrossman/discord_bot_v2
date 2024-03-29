#
# This is a Plumber API. You can run the API by clicking
# the 'Run API' button above.
#
# Find out more about building APIs with Plumber here:
#
#    https://www.rplumber.io/
#

library(plumber)
library(tidyverse)
library(tidytext)

player_data <- read_csv("./data/player_data.csv")
# %>% 
#   mutate(awareness_rating = awareRating + playRecRating,
#          strength_rating = strengthRating + weight,
#          speed_rating = accelRating + speedRating,
#          agility_rating = changeOfDirectionRating + agilityRating,
#          carry_rating = breakTackleRating + carryRating,
#          rush_finesse_rating = blockShedRating+finesseMovesRating,
#          rush_power_rating = blockShedRating+powerMovesRating,
#          big_hitter_rating = hitPowerRating,
#          zone_rating = zoneCoverRating,
#          man_rating = manCoverRating,
#          tall_rating = jumpRating+height,
#          kick_rating = kickPowerRating+kickAccRating,
#          run_block_agile_rating = runBlockFinesseRating,
#          run_block_power_rating = runBlockPowerRating,
#          )

vec = c("QB",1, "RG",1, "LG", 1, "C", 1, "LT", 1, "RT", 1, "LE", 1, "RE", 1, "DT", 1, "LOLB", 1,
        "ROLB", 1, "MLB", 2, "SS", 1, "FS", 1, "CB", 2, "WR", 3, "TE", 2, "HB", 1, "K", 1, "P", 1, "FB", 1)

required_depth <-  as_tibble(matrix(vec, ncol=2, byrow = T), .name_repair = "minimal") %>% set_names(nm = c("position", "num")) %>% 
  mutate(num = as.numeric(num))


player_data_cut <-
  player_data %>% 
  left_join(required_depth) %>% 
  arrange(desc(playerBestOvr)) %>% 
  group_by(team, position) %>% 
  mutate(rank = rank(-playerBestOvr, ties.method = "first")) %>% 
  filter(rank <= num)

remove_variables <- c("desiredBonus", "desiredSalary", "legacyScore", "kickRetRating", "jerseyNum",
                      "capReleasePenalty", "contractSalary", "contractLength",
                      "birthYear", "injuryLength", "skillPoints", "experiencePoints",
                      "contractBonus", "confRating", "draftRound", "contractYearsLeft",
                      "desiredLength","weight","capHit", "youth", "rank", "reSignStatus", "qBStyleTrait",
                      "presentationId", "id", "birthDay", "rosterId", "portraitId",
                      "homeState","birthMonth", "scheme","rookieYear","yearsPro","age",
                      "runStyle", "teamId", "3", "capReleaseNetSavings", "draftPick", "injuryRating", "playerSchemeOvr", "playerBestOvr")


player_num <- 
  player_data %>% select_if(function(col) is.numeric(col) | 
                              all(col == .$position))
important_var_df <- 
  player_num %>% 
  group_nest(position) %>% 
  mutate(data = map(data,  ~map(.x %>% select(-playerBestOvr), cor.test, y = .x$playerBestOvr) %>% 
                      map_dfr(broom::tidy, .id = "predictor"))) %>% 
  unnest(cols = data) %>% 
  group_by(position) %>% 
  filter(estimate<.99) %>% 
  filter(!(predictor %in% remove_variables)) %>% 
  filter(!grepl("trait", predictor)) %>%
  filter(!grepl("Trait", predictor)) %>%
  arrange(desc(estimate)) %>% 
  slice(1:20) %>% 
  ungroup() %>% 
  select(position, key = predictor, importance = estimate)
# 
# important_var_df <- 
#   player_data_cut %>% 
#   group_by(team, position) %>% 
#   summarise_if(is.numeric, mean) %>% 
#   gather(key = key, value = value, -team, -position) %>% 
#   ungroup() %>% 
#   filter(!(key %in% remove_variables)) %>% 
#   filter(!grepl("trait", key)) %>% 
#   filter(!grepl("Trait", key)) %>% 
#   group_by(position, key) %>% 
#   summarize(avg_position_value = mean(value)) %>% 
#   group_by(key) %>% 
#   mutate(avg_across_nfl = mean(avg_position_value)) %>% 
#   mutate(std_dev_across_nfl = sd(avg_position_value)) %>% 
#   ungroup() %>% 
#   mutate(z_score = (avg_position_value-avg_across_nfl)/std_dev_across_nfl) %>% 
#   filter(z_score >.8) %>% 
#   mutate(importance = z_score)

required_depth_bench <-  required_depth %>% mutate(num = num*2)

player_data_cut <-
  player_data %>% 
  left_join(required_depth_bench) %>% 
  arrange(desc(playerBestOvr)) %>% 
  group_by(team, position) %>% 
  mutate(rank = rank(-playerBestOvr, ties.method = "first")) %>% 
  filter(rank <= num)

df_std <- 
  player_data_cut %>% 
  gather(key = key, value = value, -team, -position, -firstName, -lastName) %>% 
  ungroup() %>% 
  left_join(important_var_df %>% select(position, key, importance), by = c("position", "key")) %>%
  filter((!is.na(importance))) %>%
  group_by(position, key) %>% 
  summarize(position_mean = mean(as.numeric(value), na.rm=T), 
            position_sd = sd(as.numeric(value), na.rm=T)) %>% 
  ungroup() 

df <- 
  player_data %>% 
  gather(key = key, value = value, -team, -position, -firstName, -lastName) %>% 
  ungroup() %>% 
  left_join(important_var_df %>% select(position, key, importance), by = c("position", "key")) %>%
  filter((!is.na(importance))) %>%
  left_join(df_std) %>% 
  mutate(z_score = (as.numeric(value)-position_mean)/position_sd) %>% 
  arrange(team, position, firstName, lastName, desc(z_score)) %>% 
  group_by(team, position, firstName, lastName) %>% 
  mutate(good_bad = case_when( 
    row_number() >max(row_number()) - 5 ~ "Weakness", 
    row_number() < 5 ~ "Strength")) %>% 
  filter(!is.na(good_bad)) %>% 
  mutate(filter_id = paste(team, firstName, lastName, position))


#* @apiTitle Produce Player Analysis
#* @apiDescription Get input from discord bot to make a chart


#* Plot a player strength and weakness
#* @param api_provided 
#* @serializer png
#* @get /plot
function(api_provided) {
  # api_provided = "Raiders Anthony McFarland (HB)"
  api_provided <- gsub(pattern = "\\(|\\)", replacement = "", x = api_provided)
  cat(print(api_provided))
  
  plot <- 
    df %>% 
    filter(filter_id == api_provided) %>% 
    mutate(good_bad = fct_relevel(good_bad, c("Weakness", "Strength"))) %>% 
    # filter(position %in% c("WR","HB")) %>% 
    ungroup() %>% 
    mutate(key = reorder_within(key, z_score, position)) %>% 
    ggplot(aes(key, z_score, fill = good_bad)) +
    geom_col(show.legend = FALSE) +
    coord_flip() +
    scale_x_reordered() +
    # ylim(-2,2)+
    # scale_y_continuous(expand = c(0,0)) +
    labs(y = "ZScore of Attribute",
         x = NULL,
         title = "Players Strengths and Weaknesses")
  
    ggsave(filename = "scout_player.png", path = "./data", device = "png", plot = plot)
  
  return(plot)
}

